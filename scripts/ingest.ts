import { runNflIngest } from "@/lib/runIngest";

runNflIngest()
  .then((r) => {
    console.log(r);
    process.exit(r.errors.length ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
