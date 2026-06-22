---
title: Broken Lightshow Test
author: Backelino
description: An intentionally invalid lightshow submission for CI validation testing.
files:
  - name: test-audio.mp3
    label: Audio Track
tags:
  - fake-tag
  - electronic
---

This lightshow is intentionally broken to test the validation pipeline.

Intentional errors:
1. Missing `audio` field (required for lightshows)
2. Missing `.fseq` file in the directory
3. Invalid tag `fake-tag` not in tags.yaml
4. Directory name uses uppercase and underscores instead of lowercase-hyphens
