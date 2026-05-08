/* eslint-disable @typescript-eslint/no-require-imports */
const { withAndroidManifest, withInfoPlist } = require("@expo/config-plugins");

function withCertificatePinning(config) {
  const withIos = withInfoPlist(config, (iosConfig) => {
    iosConfig.modResults.NSAppTransportSecurity = {
      NSAllowsArbitraryLoads: false,
      NSExceptionDomains: {
        "linksnap.id": {
          NSIncludesSubdomains: true,
          NSTemporaryExceptionAllowsInsecureHTTPLoads: false,
          NSRequiresCertificateTransparency: true,
        },
      },
    };
    return iosConfig;
  });

  return withAndroidManifest(withIos, (androidConfig) => {
    const application = androidConfig.modResults.manifest.application?.[0];
    if (application?.$) {
      application.$["android:usesCleartextTraffic"] = "false";
      application.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    }
    return androidConfig;
  });
}

module.exports = withCertificatePinning;
