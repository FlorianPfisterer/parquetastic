# Parquetastic: A Browser-Based Visual Parquet Metadata Inspector

Parquetastic ([https://parquetastic.dev](https://parquetastic.dev)) is a web app to inspect the internal structure of [Apache Parquet](https://parquet.apache.org/) files.
Immediately understand your row groups, column chunks, pages and other metadata without first downloading a CLI tool or writing custom code!

Data never leaves your device. The Parquet file is fully processed locally in your browser.

## Main Features

- **Hierarchical metadata view** — browse row groups, column chunks, and individual pages (if your file has a [page index](https://parquet.apache.org/docs/file-format/pageindex/))
- **File layout diagram** — visual byte-level map of how the file is structured on disk
- **Page and column chunk level details** — types, encodings, compression, min/max statistics
- **Two layout modes** — rows (column chunks as horizontal rows) and columns (vertical strips showing page alignment across row groups)
- **Large file support** — reads only the metadata, so even 10 GB+ Parquet files load instantly
- **Light and dark mode** with system preference detection

## Getting Started

To inspect your Parquet files, simply drop them into [https://parquetastic.dev](https://parquetastic.dev).
To develop locally, ensure you have npm / Node.js installed and then run

```bash
npm install
npm run dev
```

to install dependencies and start a development server. This will print a locahost URL on which you can find the running application.
Your changes will reflect instantly.

## How It Works

Parquetastic reads Parquet files entirely in the browser:

1. **Magic bytes** — validates the file starts and ends with `PAR1`
2. **Footer** — reads the Thrift-encoded `FileMetaData` from the end of the file
3. **Page indexes** — if available, read the `ColumnIndex` and `OffsetIndex` structures for each column chunk
4. **Visualization** — render the parsed metadata as interactive diagrams

The Thrift deserialization code uses auto-generated type definitions and parsing code based on the [Parquet format spec](https://github.com/apache/parquet-format/blob/master/src/main/thrift/parquet.thrift).

## Tech Stack

- [React](https://react.dev/) 19
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) 3

## Contributing

Contributions are welcome and I will review them as time permits.
Please open an [issue](https://github.com/FlorianPfisterer/parquetastic/issues) first if you're planning a larger change.

## Achknowledgements

Kudos to [Jan Finis](https://www.linkedin.com/in/jan-finis-206279b3/), my colleague at Salesforce, who was instantly a fan of this tool and who encouraged me to open-source it.

Big thanks to my good friends [Opus and Sonnet](https://code.claude.com/docs/en/overview) for helping me build this tool by writing most of the code.

## License

[MIT](LICENSE)
