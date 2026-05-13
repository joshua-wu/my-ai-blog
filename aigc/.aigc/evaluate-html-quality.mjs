import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlFiles = readdirSync(root)
  .filter((file) => file.endsWith(".html"))
  .sort();

function uniqueCount(values) {
  return new Set(values.filter(Boolean)).size;
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function extractAll(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function localImageExists(src) {
  if (!src || /^https?:\/\//.test(src) || src.startsWith("data:")) return true;
  return existsSync(path.join(root, src));
}

function scoreFile(file) {
  const html = readFileSync(path.join(root, file), "utf8");
  const imageSrcs = extractAll(html, /<img[^>]+src="([^"]+)"/g);
  const localMissing = imageSrcs.filter((src) => !localImageExists(src));
  const headings = countMatches(html, /<h[1-3][^>]*>/g);
  const sections = countMatches(html, /<(section|article|header|footer)\b/g);
  const taobaoLinks = countMatches(html, /https:\/\/s\.taobao\.com\/search/g);
  const buttons = countMatches(html, />[^<]*(去淘宝|搜同类|购买|看看)[^<]*</g);
  const hasSvgPlaceholder = html.includes("data:image/svg");
  const hasFallback = html.includes("图片加载失败") || html.includes("alt=");
  const colorTokens = uniqueCount(extractAll(html, /#[0-9a-fA-F]{3,8}/g));
  const hasResponsive = /@media\s*\(/.test(html) && /viewport/.test(html);
  const hasDisclaimer = /未核验|实时信息|不代表|页面实际|价格/.test(html);
  const hasHero = /class="hero"|<header/.test(html);
  const hasTableOrChecklist = /<table|这5件|清单|顺序|先说/.test(html);
  const titleText = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || "";
  const bodyTextLength = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, "").length;

  const beauty = Math.min(100, 42 + sections * 5 + headings * 3 + colorTokens * 2 + (hasHero ? 12 : 0) + (hasResponsive ? 12 : 0));
  const styleDiversity = Math.min(100, 35 + uniqueCount(["hero", "table", "feature", "compact", "split"].filter((token) => html.includes(token))) * 11 + colorTokens);
  const imageReality = Math.max(0, Math.min(100, 40 + imageSrcs.length * 8 + (hasSvgPlaceholder ? -45 : 0) + (localMissing.length ? -30 : 0) + (hasFallback ? 10 : 0)));
  const attraction = Math.min(100, 35 + Math.min(titleText.length, 26) + (hasHero ? 12 : 0) + (hasTableOrChecklist ? 12 : 0) + (bodyTextLength > 1200 ? 10 : 0));
  const conversion = Math.min(100, 30 + taobaoLinks * 5 + buttons * 8 + (hasDisclaimer ? 8 : 0) + (imageSrcs.length >= 5 ? 8 : 0));
  const total = Math.round(beauty * 0.22 + styleDiversity * 0.18 + imageReality * 0.22 + attraction * 0.18 + conversion * 0.2);

  const suggestions = [];
  if (hasSvgPlaceholder) suggestions.push("Replace generated SVG placeholders with local real product or scene photos.");
  if (localMissing.length) suggestions.push(`Fix missing local images: ${localMissing.join(", ")}`);
  if (styleDiversity < 75) suggestions.push("Add more layout variation across modules: hero, checklist, comparison table, featured product, compact cards.");
  if (beauty < 75) suggestions.push("Improve visual hierarchy with stronger hero treatment, clearer spacing, and more deliberate color contrast.");
  if (attraction < 75) suggestions.push("Strengthen the opening hook and collection value so readers immediately know why to keep reading.");
  if (conversion < 75) suggestions.push("Improve conversion by making product roles, pain points, and CTA links more explicit.");
  if (taobaoLinks === 0 && !file.includes("index")) suggestions.push("Add product CTA links to Taobao search pages.");

  return {
    file,
    total,
    beauty: Math.round(beauty),
    styleDiversity: Math.round(styleDiversity),
    imageReality: Math.round(imageReality),
    userAttraction: Math.round(attraction),
    conversion: Math.round(conversion),
    metrics: {
      imageCount: imageSrcs.length,
      uniqueImages: uniqueCount(imageSrcs),
      missingImages: localMissing.length,
      taobaoLinks,
      sections,
      colorTokens,
      bodyTextLength,
    },
    suggestions,
  };
}

const results = htmlFiles.map(scoreFile);
const average = Math.round(results.reduce((sum, item) => sum + item.total, 0) / Math.max(results.length, 1));
const weakest = [...results].sort((a, b) => a.total - b.total).slice(0, 8);

const report = {
  generatedAt: new Date().toISOString(),
  htmlFileCount: htmlFiles.length,
  averageScore: average,
  dimensions: {
    beauty: "Visual hierarchy, spacing, responsive polish, color quality.",
    styleDiversity: "Variation in modules and layouts across each page.",
    imageReality: "Real images, no generated SVG placeholders, no missing local image paths.",
    userAttraction: "Hook strength, title clarity, scannability, collection value.",
    conversion: "Product role clarity, CTA availability, Taobao links, transparent buying guidance.",
  },
  weakest,
  results,
};

writeFileSync(path.join(root, ".aigc/html-quality-report.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  htmlFileCount: report.htmlFileCount,
  averageScore: report.averageScore,
  weakest: report.weakest.map((item) => ({
    file: item.file,
    total: item.total,
    suggestions: item.suggestions.slice(0, 3),
  })),
}, null, 2));
