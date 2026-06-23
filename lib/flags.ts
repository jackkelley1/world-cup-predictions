// Flag helpers. Primary path: the live feed gives us flag image URLs like
// "https://flagcdn.com/w80/fr.png", so we extract the ISO2 code straight from
// the URL. The NAME_TO_ISO2 map is only a fallback (used when the openfootball
// schedule is the source and no flag URL is present).

export const NAME_TO_ISO2: Record<string, string> = {
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  "Bosnia and Herzegovina": "ba",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde": "cv",
  Colombia: "co",
  "Congo DR": "cd",
  "DR Congo": "cd",
  Croatia: "hr",
  Curaçao: "cw",
  "Czech Republic": "cz",
  Czechia: "cz",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Haiti: "ht",
  Iran: "ir",
  Iraq: "iq",
  "Ivory Coast": "ci",
  "Côte d'Ivoire": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  "Korea Republic": "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  Türkiye: "tr",
  Turkiye: "tr",
  "United States": "us",
  USA: "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
};

/** Pull the ISO2 (or sub-region like gb-eng) out of a flagcdn URL. */
export function iso2FromFlagUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/([a-z]{2}(?:-[a-z]+)?)\.(?:png|svg|webp)/i);
  return m ? m[1].toLowerCase() : null;
}

/** Convert a 2-letter country code to its flag emoji (regional indicators). */
export function flagEmojiFromIso2(code: string | null | undefined): string {
  if (!code) return "\u{1F3F3}\u{FE0F}"; // white flag fallback
  // Sub-regions (gb-eng, gb-sct) don't have a clean regional-indicator emoji;
  // use the tag-sequence emoji for England/Scotland, else fall back.
  const SUBREGION: Record<string, string> = {
    "gb-eng": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
    "gb-sct": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
    "gb-wls": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
  };
  if (SUBREGION[code]) return SUBREGION[code];
  const cc = code.slice(0, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "\u{1F3F3}\u{FE0F}";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + (cc.charCodeAt(0) - 65),
    A + (cc.charCodeAt(1) - 65),
  );
}

/** Best-effort flag emoji for a team given its name and/or flag URL. */
export function flagEmojiForTeam(name: string, flagUrl?: string | null): string {
  const fromUrl = iso2FromFlagUrl(flagUrl);
  if (fromUrl) return flagEmojiFromIso2(fromUrl);
  const fromMap = NAME_TO_ISO2[name];
  if (fromMap) return flagEmojiFromIso2(fromMap);
  return "\u{1F3F3}\u{FE0F}";
}

/** Flag image URL for a team, deriving one from the name map when absent. */
export function flagUrlForTeam(name: string, flagUrl?: string | null): string | null {
  if (flagUrl) return flagUrl;
  const iso = NAME_TO_ISO2[name];
  return iso ? `https://flagcdn.com/w80/${iso}.png` : null;
}
