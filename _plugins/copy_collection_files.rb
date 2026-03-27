# frozen_string_literal: true

# Copies non-document static files (audio, images, etc.) from Jekyll
# collection directories into the site output so they are available at
# the paths referenced by templates.
#
# Jekyll processes collection *documents* (Markdown) but does not
# automatically output other static files that live alongside them in
# _-prefixed collection directories.  This generator fills that gap.
#
# Source:  content/_boombox/sample-track/sample-track.mp3
# Output:  _site/content/boombox/sample-track/sample-track.mp3
#
# Templates reference: /content/{collection}/{slug}/{file}

module Jekyll
  class CollectionStaticFile < StaticFile
    def initialize(site, base, dir, name, dest_dir)
      super(site, base, dir, name)
      @dest_dir = dest_dir
    end

    def destination(dest)
      File.join(dest, @dest_dir, @name)
    end
  end

  class CopyCollectionFiles < Generator
    safe true
    priority :low

    def generate(site)
      collections_dir = site.config["collections_dir"] || ""

      site.collections.each_key do |name|
        src_dir = File.join(site.source, collections_dir, "_#{name}")
        next unless File.directory?(src_dir)

        Dir.glob(File.join(src_dir, "**", "*")).each do |filepath|
          next if File.directory?(filepath)
          next if filepath.end_with?(".md", ".markdown", ".html")

          relative = Pathname.new(filepath).relative_path_from(Pathname.new(src_dir)).to_s
          src_subdir = File.join(collections_dir, "_#{name}", File.dirname(relative))
          dest_subdir = File.join(collections_dir, name, File.dirname(relative))

          site.static_files << CollectionStaticFile.new(
            site,
            site.source,
            src_subdir,
            File.basename(relative),
            dest_subdir
          )
        end
      end
    end
  end
end
