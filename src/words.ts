// English words. ENGLISH_WORDS is the older everyday list the lessons draw on;
// the test's levels (english 200 / 1k / 5k) come from a frequency ranking.
import { ENGLISH_RANKED } from './english-ranked';

export type EnLevel = '200' | '1k' | '5k';

export interface LevelInfo { id: EnLevel; name: string; desc: string; dots: 1 | 2 | 3; size: number }

/** The English word levels, easiest first, like a typing site's word lists. */
export const EN_LEVELS: LevelInfo[] = [
  { id: '200', name: 'english 200', desc: 'the 200 most common words', dots: 1, size: 200 },
  { id: '1k', name: 'english 1k', desc: '1,000 everyday words', dots: 2, size: 1000 },
  { id: '5k', name: 'english 5k', desc: 'about 5,000 words, longer and rarer', dots: 3, size: ENGLISH_RANKED.length },
];

export const isLevel = (v: unknown): v is EnLevel => EN_LEVELS.some(l => l.id === v);

const pools = new Map<EnLevel, string[]>();
/** The words of one level: the most frequent N words of the ranking. */
export function englishPool(level: EnLevel): string[] {
  let p = pools.get(level);
  if (!p) { p = ENGLISH_RANKED.slice(0, EN_LEVELS.find(l => l.id === level)!.size); pools.set(level, p); }
  return p;
}

export const ENGLISH_WORDS = `the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both between need mean call develop under last right move thing general school never same another begin while number part turn real leave might want point form off child few small since against ask late home interest large person end open public follow during present without again hold govern around possible head consider word program problem however lead system set order eye plan run keep face fact group play stand increase early course change help line city put close case force meet once water upon war build hear light unite live every country bring center let side try provide continue name certain power pay result question study woman member until far night always service away report something company week church toward start social room figure nature though young less enough almost read include president nothing yet better big boy cost business value second why clear expect family complete act sense mind experience art next near direct car law industry important girl god several matter usual rather per often kind among white reason action return foot care simple within love human along appear doctor believe speak active student month drive concern best door hope example inform body ever least probable understand reach effect different idea whole control condition field pass fall note special talk particular today measure walk teach low hour type carry rate remain full street easy although record sit determine level local sure receive thus moment spirit train college religion perhaps music grow free cause serve age book board recent sound office cut step class true history position above strong friend necessary add court deal tax support party whether either land material happen education death agree arm mother across quite anything town past view society manage answer break organize half fire lose money stop actual already effort wait department able political learn voice air together shall cover common subject draw short wife treat limit road letter color behind produce send term total university rise century success minute remember purpose test fight watch situation south ago difference stage father table rest bear entire market prepare explain offer plant charge ground west picture hard front lie modern dark surface rule regard dance peace observe future wall farm claim firm operation further pressure property morning amount top outside piece sometimes beauty trade fear demand wonder list accept judge paint mile soon responsible allow secretary heart union slow island enter drink story experiment stay paper space apply decide share desire spend sign therefore various visit supply officer doubt private immediate wish contain feed raise describe ready horse son exist north suggest station effective food deep wide alone character english happy critic unit product respect drop nor fill cold represent sudden basic kill fine trouble mark single press heavy attempt origin standard ready`.split(/\s+/);

export function randomWords(count: number, pool: string[] = ENGLISH_WORDS): string[] {
  const out: string[] = [];
  let prev = '';
  while (out.length < count) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (w === prev) continue;
    out.push(w);
    prev = w;
  }
  return out;
}
