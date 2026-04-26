//! TLS handshake inspector.
//!
//! Connects to a `host:port`, performs a TLS handshake, and surfaces:
//!   - the negotiated protocol version (TLS 1.2 / 1.3)
//!   - the negotiated cipher suite
//!   - the peer's certificate chain (server cert + intermediates), each
//!     parsed via `x509-parser` for subject / issuer / validity / serial
//!     number / SANs.
//!
//! Pure-Rust through `rustls` (no system OpenSSL). Trust verification is
//! performed against `webpki-roots` so the user sees standard browser-like
//! behavior; if the chain fails to verify we still surface the certs with
//! a `tls_handshake_failed` error so the inspector remains useful.

use std::sync::Arc;
use std::time::Duration;

use rustls::ClientConfig;
use rustls_pki_types::{CertificateDer, ServerName};
use serde::Serialize;
use tokio::net::TcpStream;
use tokio_rustls::TlsConnector;

use crate::error::{HyperspannerError, HyperspannerResult};

/// Per-cert summary; mirrors the TS-side `TlsCert` interface across the
/// IPC boundary.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TlsCert {
    pub subject: String,
    pub issuer: String,
    /// ISO-8601 timestamps. Stored as `String` so the JS side doesn't have
    /// to translate seconds-since-epoch into a printable date.
    pub not_before: String,
    pub not_after: String,
    pub serial_number: String,
    pub signature_algorithm: String,
    pub subject_alt_names: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TlsInspectResult {
    pub protocol_version: String,
    pub cipher_suite: String,
    pub cert_chain: Vec<TlsCert>,
    /// Was the chain accepted by webpki-roots? `true` for trusted public
    /// hosts; `false` for self-signed / private CA / expired chains. The
    /// tool surfaces both states in the UI without failing the inspect.
    pub trusted: bool,
}

const DEFAULT_TIMEOUT_MS: u64 = 8_000;

#[tauri::command]
pub async fn tls_inspect(
    host: String,
    port: u16,
    timeout_ms: Option<u64>,
) -> HyperspannerResult<TlsInspectResult> {
    if host.trim().is_empty() {
        return Err(HyperspannerError::InvalidEndpoint {
            detail: "host must not be empty".into(),
        });
    }
    if port == 0 {
        return Err(HyperspannerError::InvalidEndpoint {
            detail: "port must be 1..=65535".into(),
        });
    }
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS));

    inspect(host, port, timeout).await
}

async fn inspect(
    host: String,
    port: u16,
    timeout: Duration,
) -> HyperspannerResult<TlsInspectResult> {
    // Trust store backed by `webpki-roots` — the same CA list browsers
    // ship with. We *also* configure a permissive verifier as a fallback
    // for the "is this chain technically parseable even if not trusted"
    // case (self-signed labs, internal CAs). To keep the surface
    // explicit, we run the strict path first and fall through to a
    // permissive retry only on cert-verification failure — never on
    // network errors.

    // Strict pass.
    match handshake_with_verifier(&host, port, timeout, false).await {
        Ok(mut result) => {
            result.trusted = true;
            Ok(result)
        }
        Err(HyperspannerError::TlsHandshakeFailed { detail })
            if looks_like_cert_failure(&detail) =>
        {
            // Fallback: permissive verifier so the user can still see the
            // chain. Mark `trusted: false` so the UI can surface the
            // distinction.
            let mut result = handshake_with_verifier(&host, port, timeout, true).await?;
            result.trusted = false;
            // Tuck the original cert-verification reason into the
            // protocol_version field if it would otherwise be empty
            // (defensive — both passes should populate it).
            if !detail.is_empty() && result.protocol_version.is_empty() {
                result.protocol_version = format!("(verifier rejected: {detail})");
            }
            Ok(result)
        }
        Err(other) => Err(other),
    }
}

/// One handshake attempt with either the standard verifier or a
/// permissive one. Returns the negotiated protocol/cipher and a parsed
/// cert chain.
async fn handshake_with_verifier(
    host: &str,
    port: u16,
    timeout: Duration,
    permissive: bool,
) -> HyperspannerResult<TlsInspectResult> {
    let server_name =
        ServerName::try_from(host.to_string()).map_err(|e| HyperspannerError::InvalidEndpoint {
            detail: format!("invalid SNI host: {e}"),
        })?;

    let config = if permissive {
        permissive_client_config()
    } else {
        standard_client_config()
    };

    let connector = TlsConnector::from(Arc::new(config));
    let addr = format!("{host}:{port}");

    let tcp = tokio::time::timeout(timeout, TcpStream::connect(&addr))
        .await
        .map_err(|_| HyperspannerError::NetworkError {
            host: host.to_string(),
            port,
            detail: format!("connect timed out after {timeout:?}"),
        })?
        .map_err(|e| HyperspannerError::NetworkError {
            host: host.to_string(),
            port,
            detail: e.to_string(),
        })?;

    let tls = tokio::time::timeout(timeout, connector.connect(server_name, tcp))
        .await
        .map_err(|_| HyperspannerError::TlsHandshakeFailed {
            detail: format!("handshake timed out after {timeout:?}"),
        })?
        .map_err(|e| HyperspannerError::TlsHandshakeFailed {
            detail: e.to_string(),
        })?;

    let (_io, conn) = tls.get_ref();
    let protocol_version = conn
        .protocol_version()
        .map(|p| format!("{p:?}"))
        .unwrap_or_else(|| "unknown".into());
    let cipher_suite = conn
        .negotiated_cipher_suite()
        .map(|c| format!("{:?}", c.suite()))
        .unwrap_or_else(|| "unknown".into());
    let peer_certs = conn.peer_certificates().unwrap_or(&[]).to_vec();

    let cert_chain = peer_certs
        .iter()
        .map(|c| parse_cert(c))
        .collect::<HyperspannerResult<Vec<TlsCert>>>()?;

    // `trusted` is filled in by the caller — the strict path overrides to
    // true; the fallback path overrides to false.
    Ok(TlsInspectResult {
        protocol_version,
        cipher_suite,
        cert_chain,
        trusted: true,
    })
}

fn standard_client_config() -> ClientConfig {
    let root_store = root_cert_store();
    ClientConfig::builder()
        .with_root_certificates(root_store)
        .with_no_client_auth()
}

fn permissive_client_config() -> ClientConfig {
    use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
    use rustls::pki_types::UnixTime;
    use rustls::DigitallySignedStruct;

    /// Verifier that accepts any chain. Used only as a fallback to LET the
    /// user inspect a chain that the strict verifier rejected. The result
    /// is flagged `trusted: false` so the UI surfaces the distinction.
    #[derive(Debug)]
    struct AnyServer;

    impl ServerCertVerifier for AnyServer {
        fn verify_server_cert(
            &self,
            _end_entity: &CertificateDer<'_>,
            _intermediates: &[CertificateDer<'_>],
            _server_name: &ServerName<'_>,
            _ocsp_response: &[u8],
            _now: UnixTime,
        ) -> Result<ServerCertVerified, rustls::Error> {
            Ok(ServerCertVerified::assertion())
        }
        fn verify_tls12_signature(
            &self,
            _message: &[u8],
            _cert: &CertificateDer<'_>,
            _dss: &DigitallySignedStruct,
        ) -> Result<HandshakeSignatureValid, rustls::Error> {
            Ok(HandshakeSignatureValid::assertion())
        }
        fn verify_tls13_signature(
            &self,
            _message: &[u8],
            _cert: &CertificateDer<'_>,
            _dss: &DigitallySignedStruct,
        ) -> Result<HandshakeSignatureValid, rustls::Error> {
            Ok(HandshakeSignatureValid::assertion())
        }
        fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
            // Mirror the default rustls schemes. Keep in sync with rustls
            // upgrades.
            use rustls::SignatureScheme::*;
            vec![
                RSA_PKCS1_SHA256,
                RSA_PKCS1_SHA384,
                RSA_PKCS1_SHA512,
                ECDSA_NISTP256_SHA256,
                ECDSA_NISTP384_SHA384,
                ECDSA_NISTP521_SHA512,
                RSA_PSS_SHA256,
                RSA_PSS_SHA384,
                RSA_PSS_SHA512,
                ED25519,
            ]
        }
    }

    ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(AnyServer))
        .with_no_client_auth()
}

fn root_cert_store() -> rustls::RootCertStore {
    let mut store = rustls::RootCertStore::empty();
    store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    store
}

/// Heuristic: did the handshake fail because of cert verification, vs.
/// some other reason (network, protocol mismatch, etc)? rustls error
/// messages mention "InvalidCertificate" / "UnknownIssuer" /
/// "CertNotValidYet" / "CertExpired" — match on those broadly.
fn looks_like_cert_failure(detail: &str) -> bool {
    let lower = detail.to_lowercase();
    lower.contains("certificate")
        || lower.contains("invalidcert")
        || lower.contains("unknownissuer")
        || lower.contains("notvalidyet")
        || lower.contains("expired")
}

/// Parse one DER cert into the user-facing summary shape. We rely on
/// `x509-parser` for the heavy lifting; everything we surface is a
/// plain-text representation a developer would expect from
/// `openssl x509 -text`.
fn parse_cert(cert_der: &CertificateDer<'_>) -> HyperspannerResult<TlsCert> {
    use x509_parser::prelude::*;

    let (_, parsed) = X509Certificate::from_der(cert_der.as_ref()).map_err(|e| {
        HyperspannerError::CertificateParseFailed {
            detail: format!("{e}"),
        }
    })?;

    let subject = parsed.subject().to_string();
    let issuer = parsed.issuer().to_string();
    let not_before = parsed.validity().not_before.to_string();
    let not_after = parsed.validity().not_after.to_string();
    let serial_number = parsed.serial.to_string();
    let signature_algorithm = format!("{:?}", parsed.signature_algorithm.algorithm);

    let mut sans = Vec::new();
    if let Ok(Some(san)) = parsed.subject_alternative_name() {
        for name in &san.value.general_names {
            sans.push(format!("{name:?}"));
        }
    }

    Ok(TlsCert {
        subject,
        issuer,
        not_before,
        not_after,
        serial_number,
        signature_algorithm,
        subject_alt_names: sans,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn empty_host_rejected() {
        let err = tls_inspect("".into(), 443, None).await.unwrap_err();
        assert_eq!(err.kind(), "invalid_endpoint");
    }

    #[tokio::test]
    async fn zero_port_rejected() {
        let err = tls_inspect("example.com".into(), 0, None).await.unwrap_err();
        assert_eq!(err.kind(), "invalid_endpoint");
    }

    #[test]
    fn looks_like_cert_failure_recognizes_common_messages() {
        assert!(looks_like_cert_failure("invalid certificate"));
        assert!(looks_like_cert_failure("UnknownIssuer"));
        assert!(looks_like_cert_failure("InvalidCertificate"));
        assert!(looks_like_cert_failure("expired"));
        assert!(!looks_like_cert_failure("connection refused"));
    }
}
