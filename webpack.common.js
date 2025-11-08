const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");

module.exports = {
  entry: {
    app: path.resolve(__dirname, "src/scripts/index.js"),
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: path.resolve(__dirname, "src/index.html"),
      favicon: path.resolve(__dirname, "src/public/images/favicon.png"),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "src/public/"),
          to: path.resolve(__dirname, "dist/public/"),
        },
        {
          from: path.resolve(__dirname, "src/sw.js"),
          to: path.resolve(__dirname, "dist/"),
        },
        {
          from: path.resolve(__dirname, "src/manifest.json"),
          to: path.resolve(__dirname, "dist/"),
        },
      ],
    }),
    new WorkboxWebpackPlugin.InjectManifest({
      swSrc: path.resolve(__dirname, "src/sw.js"),
      swDest: "sw.js",
      exclude: [/\.map$/, /manifest\.json$/, /_redirects/],
    }),
  ],
};
