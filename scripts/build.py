#!/usr/bin/env python3
import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def read_config(path):
    cfg = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        cfg[key.strip()] = value.strip()
    return cfg


def must_read(path):
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise SystemExit(f"Missing required file: {path}") from exc


def render_template(template, **values):
    html = template
    for key, value in values.items():
        html = html.replace(f"{{{{{key}}}}}", value)
    return html


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build a single-file game")
    parser.add_argument("config", type=pathlib.Path, help="Path to the game config.mk")
    parser.add_argument("output", type=pathlib.Path, help="Output HTML file")
    args = parser.parse_args(argv)

    config = read_config(args.config)
    try:
        game_id = config["GAME_ID"]
        title = config["TITLE"]
    except KeyError as exc:
        raise SystemExit(f"Missing required config value: {exc.args[0]}") from exc

    game_dir = args.config.parent
    entry_js = game_dir / config.get("ENTRY_JS", "game.js")
    entry_css = game_dir / config.get("ENTRY_CSS", "")

    base_css = must_read(ROOT / "lib" / "base.css")
    runtime_js = must_read(ROOT / "lib" / "runtime.js")
    game_js = must_read(entry_js)

    styles = base_css
    if entry_css.name:
        styles = f"{styles}\n\n{must_read(entry_css)}"

    template = must_read(ROOT / "lib" / "template.html")
    html = render_template(
        template,
        TITLE=title,
        GAME_ID=game_id,
        STYLES=styles,
        RUNTIME=runtime_js,
        GAME_SCRIPT=game_js,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
