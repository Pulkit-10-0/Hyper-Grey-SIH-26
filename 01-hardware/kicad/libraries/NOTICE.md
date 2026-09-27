# KiCad standard library attribution and changes

The standard footprint files in this folder and the companion files in
`../3dmodels/` are a selected collection from the official KiCad community
libraries installed with KiCad 9.0.7 for macOS. Copyright remains with their
respective KiCad library contributors. Existing copyright, author and license
headers in the files are retained.

The standard library collection uses Creative Commons Attribution-ShareAlike
4.0 International with the KiCad libraries' electronic-design exception. Some
older included model files carry individual GPL-3.0-or-later notices with their
own design exception; those original notices are preserved and listed in
`../3dmodels/LICENSES.md`. The full GNU license is `GPL-3.0-or-later.txt`. The
upstream license notice is included as `LICENSE_KiCad_Libraries.md`, and the
full CC license text is `CC-BY-SA-4.0.txt`. The same notice accompanies the 3D
models. The exception and its scope are explained in those license files.

Source collections:

- https://gitlab.com/kicad/libraries/kicad-footprints
- https://gitlab.com/kicad/libraries/kicad-packages3D
- https://www.kicad.org/libraries/license/

Changes to copied footprint files: only their standard 3D-model URI prefix was
replaced with `${KIPRJMOD}/3dmodels/` so this project opens without a machine-
specific library path. Pad geometry, courtyard, silkscreen and model transforms
were not altered. Model files are copied byte for byte, including their
attribution headers. `library_manifest.json` records filenames and SHA-256
checksums. `model_path_map.json` maps installed model paths to project paths.

This notice covers the copied standard library collection. The project's
custom `AUV_WirePads.pretty` library is separate and is not represented as
upstream KiCad library material. The project library table preserves its entry.
