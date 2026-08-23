module.exports = {
  webpack(config, { webpack, isServer, nextRuntime }) {
    // Avoid AWS SDK Node.js require issue
    if (isServer && nextRuntime === "nodejs")
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^aws-crt$/ })
      );

    // config.externals.push({
    //   "@aws-sdk/signature-v4-multi-region":
    //     "commonjs @aws-sdk/signature-v4-multi-region",
    // });

    return config;
  },
  // No next/image anywhere in the app, so images.remotePatterns configured
  // nothing. It listed taste.stlr.cx's hostnames, left over from the fork.
};
