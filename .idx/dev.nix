{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
  ];

  env = {};
  idx = {
    extensions = [ "whizkydee.material-palenight-theme" "christian-kohler.npm-intellisense" "christian-kohler.path-intellisense" "dbaeumer.vscode-eslint" "esbenp.prettier-vscode" "rvest.vs-code-prettier-eslint" "emeraldwalk.RunOnSave"];

    previews = {
      enable = true;
      previews = {};
    };

    workspace = {
      onCreate = {
        npm-install = "npm install";
      };
      onStart = {};
    };
  };
}
