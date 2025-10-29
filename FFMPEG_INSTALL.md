# FFmpeg Installation for ClipForge

ClipForge requires FFmpeg to be installed on your system to extract video metadata and export videos.

## macOS Installation

```bash
brew install ffmpeg
```

## Verify Installation

```bash
ffmpeg -version
```

If you see version information, FFmpeg is installed correctly.

## Windows Installation

1. Download FFmpeg from https://www.ffmpeg.org/download.html
2. Extract the zip file
3. Add the `bin` folder to your system PATH
4. Open a new terminal and run `ffmpeg -version` to verify

## Linux Installation

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

### Fedora
```bash
sudo dnf install ffmpeg
```
