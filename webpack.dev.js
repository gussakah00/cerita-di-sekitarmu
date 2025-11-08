const path = require("path");
const common = require("./webpack.common.js");
const { merge } = require("webpack-merge");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    static: path.resolve(__dirname, "dist"),
    port: 9000,
    open: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },
});
