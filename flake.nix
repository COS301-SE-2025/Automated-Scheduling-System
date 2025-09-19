{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";

  outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = import nixpkgs {
      inherit system;
      config.allowUnfree = true;
    };
  in {
    devShells.${system}.e2e = pkgs.mkShell {
      packages = with pkgs; [
        nodejs_20
        pnpm
        cypress
        chromium   # or google-chrome
      ];
      shellHook = ''
        # Tell the npm CLI to use the Nix-installed Cypress binary
        export CYPRESS_RUN_BINARY="$(command -v cypress)"
        # Wayland/Hyprland: try native; if issues, unset to force XWayland
        export ELECTRON_OZONE_PLATFORM_HINT=wayland
        echo "Cypress binary: $CYPRESS_RUN_BINARY"
      '';
    };
  };
}
