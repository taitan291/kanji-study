{
  description = "漢字の書き取り練習サイト（kanji.taitan.uk）";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    git-hooks = {
      url = "github:cachix/git-hooks.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      imports = [
        inputs.treefmt-nix.flakeModule
        inputs.git-hooks.flakeModule
      ];

      perSystem =
        { config, pkgs, ... }:
        {
          # 整形: JS/TS/Svelte/CSS/JSON は node_modules の Prettier（プラグイン込み）、Nix は nixfmt
          treefmt = {
            projectRootFile = "flake.nix";
            programs.nixfmt.enable = true;
            settings.formatter.prettier = {
              command = "${pkgs.bash}/bin/bash";
              options = [
                "-euc"
                ''exec ./node_modules/.bin/prettier --write --ignore-unknown "$@"''
                "--"
              ];
              includes = [
                "*.ts"
                "*.js"
                "*.svelte"
                "*.css"
                "*.json"
                "*.html"
                "*.yml"
                "*.yaml"
              ];
              excludes = [
                "package-lock.json"
                "public/data/questions.json"
                "docs/*"
              ];
            };
          };

          # コミット前のチェック
          pre-commit.settings.hooks = {
            treefmt = {
              enable = true;
              package = config.treefmt.build.wrapper;
            };
            eslint-project = {
              enable = true;
              name = "eslint";
              entry = "npx --no-install eslint --max-warnings=0";
              files = "\\.(ts|js|svelte)$";
              language = "system";
            };
            validate-questions = {
              enable = true;
              name = "validate sample questions";
              entry = "npx --no-install tsx scripts/validate-questions.ts";
              files = "^example\\.json$";
              language = "system";
            };
          };

          devShells.default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_22
              pkgs.wrangler
              config.treefmt.build.wrapper
            ];
            shellHook = ''
              ${config.pre-commit.installationScript}
              if [ ! -d node_modules ]; then
                echo "npm ci を実行してください"
              fi
            '';
          };
        };
    };
}
