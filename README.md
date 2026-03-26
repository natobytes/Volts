# Volts

Community-curated content catalog for Tesla vehicles — light shows, lock sounds, boombox tracks, wraps, and horn sounds.

Built with [Jekyll](https://jekyllrb.com/) and served via GitHub Pages.

## Content Categories

- **Light Shows** — custom LED sequences
- **Lock Sounds** — sounds that play when locking/unlocking
- **Boombox** — external speaker audio tracks
- **Wraps** — vehicle wrap designs and templates
- **Horn Sounds** — custom horn replacements

## Local Setup

### Prerequisites

- [Ruby](https://www.ruby-lang.org/) (for Jekyll)
- [Bundler](https://bundler.io/) (`gem install bundler`)
- [Node.js](https://nodejs.org/) (for content validation scripts)

### Install Dependencies

```bash
bundle install
npm install
```

### Run Locally

```bash
bundle exec jekyll serve
```

The site will be available at `http://localhost:4000/Volts/`.

### Validate Content

```bash
npm run validate
```

### Build JSON API

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b my-new-content`)
3. Add your content as a Markdown file in the appropriate `content/_<category>/` folder
4. Run `npm run validate` to check your submission
5. Commit your changes and open a Pull Request

Each content file uses Jekyll front matter. See existing files in `content/` for examples of the required fields per category.

Pull request templates are provided for each content type — GitHub will prompt you to fill in the relevant details.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
