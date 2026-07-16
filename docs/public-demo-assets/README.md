# Public demo media pack

This folder contains only reproducible public-demo media. It exists so another device can inspect, regenerate, and adjust the presentation without opening a personal ledger or using a private image collection.

## Contents

- `overview.png`, `assets.png`, `smart-add.png`: screenshots generated from the built-in five-item synthetic seed.
- `assets-with-public-thumbnails.png`: the same card-grid view after the five public thumbnail files below are uploaded through a fresh temporary app profile.
- `thumbnails/`: public stock thumbnails for the synthetic laptop, camera, bicycle, gift-card, and membership examples.
- `social/`: three social-preview PNGs and their editable HTML sources. `asset-card-promo.html` is the data-rich promotional composition.

## Thumbnail provenance

| File | Synthetic example | Source |
| --- | --- | --- |
| `laptop.jpg` | 演示笔记本 | [Unsplash image](https://images.unsplash.com/photo-1496181133206-80ce9b88a853) |
| `camera.jpg` | 旅行相机 | [Unsplash image](https://images.unsplash.com/photo-1516035069371-29a1b244cc32) |
| `bike.jpg` | 通勤自行车 | [Unsplash image](https://images.unsplash.com/photo-1485965120184-e220f721d03e) |
| `gift-card.jpg` | 演示礼品卡 | [Unsplash photo page](https://unsplash.com/photos/adidas-gift-card-90NNkvqBdtE) |
| `membership.jpg` | 演示年度会员 | [Unsplash image](https://images.unsplash.com/photo-1506784983877-45594efa4cbe) |

The [Unsplash License](https://unsplash.com/license) permits free commercial and non-commercial use. Source URLs are retained for traceability even where attribution is not required.

`gift-card.jpg` visibly contains an Adidas card. It is retained for cross-device debugging of the five-card upload flow, but should be replaced with an unbranded image before any public marketing screenshot uses it.

## Reproduce on another device

```sh
npm ci
node tools/capture-public-previews.mjs
node tools/capture-thumbnail-card-preview.mjs
```

Both scripts create fresh temporary Electron profiles. They do not read an existing IndexedDB database, user-uploaded photo, JSON backup, API key, or internal report.

## Scope boundary

- Asset labels, values, dates, and lifecycle numbers in every PNG are synthetic demo data.
- The committed JPEGs are public stock source files, not personal photos.
- The social PNGs include explicit Alpha/synthetic-data boundaries and do not claim investment tracking, cloud sync, or a signed installer.
