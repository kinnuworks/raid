/**
 * Army registry. An army is a token community; membership is read from on-chain holdings.
 * Each army gets an ink and a hatch pattern so the map still reads with colour turned off.
 */
export type Pattern = "solid" | "diagonal" | "cross" | "dots" | "rows";

export interface Army {
  slug: string;
  ticker: string;
  name: string;
  chain: "cardano";
  /** policyId + "." + assetNameHex, exactly as Koios reports it */
  asset: string;
  ink: string;
  pattern: Pattern;
}

const INK = {
  vermilion: "#D2361F",
  ultramarine: "#2347A6",
  ochre: "#C8901C",
  field: "#3F6B3A",
  plum: "#6B2E5F",
} as const;

export const ARMIES: Army[] = [
  { slug: "snek", ticker: "SNEK", name: "Snek", chain: "cardano", asset: "279c909f348e533da5808898f87f9a14bb2c3dfbbacccd631d927a3f.534e454b", ink: INK.field, pattern: "solid" },
  { slug: "hosky", ticker: "HOSKY", name: "Hosky", chain: "cardano", asset: "a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59", ink: INK.ochre, pattern: "solid" },
  { slug: "night", ticker: "NIGHT", name: "Night", chain: "cardano", asset: "0691b2fecca1ac4f53cb6dfb00b7013e561d1f34403b957cbb5af1fa.4e49474854", ink: INK.ultramarine, pattern: "solid" },
  { slug: "strike", ticker: "STRIKE", name: "Strike", chain: "cardano", asset: "f13ac4d66b3ee19a6aa0f2a22298737bd907cc95121662fc971b5275.535452494b45", ink: INK.vermilion, pattern: "solid" },
  { slug: "min", ticker: "MIN", name: "Minswap", chain: "cardano", asset: "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6.4d494e", ink: INK.plum, pattern: "solid" },
  { slug: "iag", ticker: "IAG", name: "Iagon", chain: "cardano", asset: "5d16cc1a177b5d9ba9cfa9793b07e60f1fb70fea1f8aef064415d114.494147", ink: INK.ultramarine, pattern: "diagonal" },
  { slug: "wmtx", ticker: "WMTX", name: "World Mobile", chain: "cardano", asset: "e5a42a1a1d3d1da71b0449663c32798725888d2eb0843c4dabeca05a.576f726c644d6f62696c65546f6b656e58", ink: INK.plum, pattern: "diagonal" },
  { slug: "sundae", ticker: "SUNDAE", name: "Sundae", chain: "cardano", asset: "9a9693a9a37912a5097918f97918d15240c92ab729a0b7c4aa144d77.53554e444145", ink: INK.vermilion, pattern: "diagonal" },
  { slug: "indy", ticker: "INDY", name: "Indigo", chain: "cardano", asset: "533bb94a8850ee3ccbe483106489399112b74c905342cb1792a797a0.494e4459", ink: INK.field, pattern: "diagonal" },
  { slug: "cock", ticker: "COCK", name: "Cock", chain: "cardano", asset: "49e423161ef818adc475c783571cb479d5f15ad52a01a240eacc0d3b.434f434b", ink: INK.ochre, pattern: "diagonal" },
  { slug: "fren", ticker: "FREN", name: "Fren", chain: "cardano", asset: "fc11a9ef431f81b837736be5f53e4da29b9469c983d07f321262ce61.4652454e", ink: INK.field, pattern: "cross" },
  { slug: "newm", ticker: "NEWM", name: "Newm", chain: "cardano", asset: "682fe60c9918842b3323c43b5144bc3d52a23bd2fb81345560d73f63.4e45574d", ink: INK.plum, pattern: "cross" },
  { slug: "book", ticker: "BOOK", name: "Book", chain: "cardano", asset: "51a5e236c4de3af2b8020442e2a26f454fda3b04cb621c1294a0ef34.424f4f4b", ink: INK.ultramarine, pattern: "cross" },
  { slug: "drip", ticker: "DRIP", name: "Drip", chain: "cardano", asset: "af2e27f580f7f08e93190a81f72462f153026d06450924726645891b.44524950", ink: INK.vermilion, pattern: "cross" },
  { slug: "flow", ticker: "FLOW", name: "Flow", chain: "cardano", asset: "2d9db8a89f074aa045eab177f23a3395f62ced8b53499a9e4ad46c80.464c4f57", ink: INK.ochre, pattern: "cross" },
];

export const ARMY_BY_SLUG = Object.fromEntries(ARMIES.map((a) => [a.slug, a]));
export const ARMY_BY_ASSET = Object.fromEntries(ARMIES.map((a) => [a.asset, a]));
