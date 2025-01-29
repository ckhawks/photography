module.exports = {
  webpack(config, { webpack, isServer, nextRuntime }) {
    config.resolve.fallback = {
      // if you miss it, all the other options in fallback, specified
      // by next.js will be dropped.
      ...config.resolve.fallback,

      fs: false, // the solution
    };

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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "taste-gallery.s3.us-west-1.amazonaws.com",
        port: "",
        pathname: "/**", // remove first slash?
      },
      {
        protocol: "https",
        hostname: "taste-images.stlr.cx",
        port: "",
        pathname: "/**", // remove first slash?
      },
    ], // https://taste-gallery.s3.us-west-1.amazonaws.com/photog/016pv4ndnwna1.webp
  },
};
