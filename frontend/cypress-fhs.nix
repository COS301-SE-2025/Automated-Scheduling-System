{ pkgs ? import <nixpkgs> {} }:

# Create an FHS environment for Cypress to work around NixOS dynamic linking issues
pkgs.buildFHSUserEnv {
  name = "cypress-fhs";
  
  targetPkgs = pkgs: with pkgs; [
    nodejs_20
    yarn
    npm
    # Cypress dependencies
    gtk3
    nss
    glib
    atk
    at-spi2-atk
    cairo
    pango
    gdk-pixbuf
    gtk3
    dbus
    libdrm
    libxkbcommon
    mesa
    xorg.libX11
    xorg.libXcomposite
    xorg.libXcursor
    xorg.libXdamage
    xorg.libXext
    xorg.libXfixes
    xorg.libXi
    xorg.libXrandr
    xorg.libXrender
    xorg.libXScrnSaver
    xorg.libXtst
    xorg.libxshmfence
    # Additional libraries that might be needed
    alsa-lib
    cups
    libuuid
    expat
    libxslt
    fontconfig
    freetype
  ];
  
  multiPkgs = pkgs: with pkgs; [
    # 32-bit libraries if needed
  ];
  
  runScript = "bash";
  
  profile = ''
    export CYPRESS_INSTALL_BINARY=0
    export CYPRESS_RUN_BINARY=${pkgs.cypress}/bin/Cypress
    export DISPLAY=:0
    echo "Cypress FHS environment ready!"
    echo "You can now run: npx cypress open or npx cypress run"
  '';
}
