import { redirect } from "next/navigation";

/**
 * `/` serves the legacy marketplace (`public/index.html`) so one `npm run dev`
 * matches GitHub Pages behavior. React demos: `/tokenization`, `/homeowner-feasibility`.
 */
export default function HomePage() {
  redirect("/index.html");
}
