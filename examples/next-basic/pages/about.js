import { anchors } from "../src/anchors.js";
import { aboutTitle } from "../src/messages-about.js";

export default function About() {
  return (
    <main>
      <h1>{aboutTitle}</h1>
      <a href={anchors.about.href}>{anchors.about.label}</a>
    </main>
  );
}
