var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "interest friend silk quiz wealth elegant artist spread labor despair december tenant";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "HTTP://127.0.0.1:7545", 0, 50);
      },
      network_id: '*',
      gas: 6721975,
      port: 7545
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};