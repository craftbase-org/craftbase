## Tailwind CSS Notes:

If you find that some css class is not appearing in tailwind as it should be, based on tailwind docs, it might be because of the below reason

```
  Tailwind only generates CSS for classes it finds statically in scanned files. If border-4 or border-8 don't appear as complete strings in your .html or .js files (e.g., they're dynamically constructed
  like 'border-' + size), Tailwind won't include those classes in the output CSS, while border-2 does appear literally somewhere and survives the purge.
```

To fix this, you can have some css class used somewhere, even in commented out code (as a simple hack) so that tailwind picks it up and generates it in index.css it generates as output.
