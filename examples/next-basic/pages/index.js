import { anchors } from "../src/anchors.js";
import { homeTitle } from "../src/messages-home.js";

export default function Home() {
  return (
    <main>
      <h1>{homeTitle}</h1>
      <a href={anchors.home.href}>{anchors.home.label}</a>
    </main>
  );
}
