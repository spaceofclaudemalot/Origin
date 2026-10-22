/**
 * Formulations stéréotypées issues du catalogue « Humanizer » (MIT, github.com/blader/humanizer),
 * lui-même fondé sur la page Wikipédia « Signs of AI writing ». Chaque entrée reprend un
 * motif du catalogue (numéro de § en commentaire) en anglais et en français.
 *
 * Écartés volontairement : guillemets courbes (§21, « » et ’ sont la typographie française),
 * traits d'union (§10, règle anglaise), gras et titres décoratifs (§19-20, dépendent de la mise
 * en forme et non du texte brut).
 */

export type HumanizerKind =
  | "split-contrast"
  | "inflated"
  | "residue"
  | "disclaimer"
  | "runup"
  | "straw"
  | "saying"
  | "closer";

export interface HumanizerPattern {
  kind: HumanizerKind;
  regex: RegExp;
  confidence: number;
}

const A = "['’]";
const L = "[\\p{L}\\p{N}\\p{M}]";
// Début de phrase : « To be clear » en milieu de phrase n'est pas un signe
const START = "(?<=^|[.!?…]\\s+|\\n)";

/** Alternatives encadrées par des frontières Unicode ; une fin par apostrophe est valide. */
function phrases(alternatives: string[]): string {
  return `(?<!${L})(?:${alternatives.join("|")})(?:(?!${L})|(?<=['’]))`;
}

const re = (source: string) => new RegExp(source, "giu");

export const HUMANIZER_PATTERNS: HumanizerPattern[] = [
  // §1 : contraste étalé sur deux phrases, « not only … but », « non pas … mais »
  {
    kind: "split-contrast",
    confidence: 0.75,
    regex: re(
      phrases([
        `(?:this|that|it) (?:does not|doesn${A}t|do not) mean [^.!?]{1,100}[.!?]\\s+(?:it|this|that) means`,
        `(?:cela|ça|ce) ne (?:veut|signifie) pas (?:dire )?[^.!?]{1,100}[.!?]\\s+(?:cela|ça|ce) (?:veut dire|signifie)`,
      ]),
    ),
  },
  {
    kind: "split-contrast",
    confidence: 0.6,
    regex: re(
      phrases([
        "not only [^.!?]{3,80}?,? but(?: also)?",
        "non seulement [^.!?]{3,80}?,? mais (?:aussi|également|encore)",
        `il ne s${A}agit pas (?:seulement |simplement )?d(?:e |${A})[^.!?]{1,80}?, mais`,
        "non pas [^.!?]{3,60}?, mais",
      ]),
    ),
  },

  // §13 : signification gonflée
  {
    kind: "inflated",
    confidence: 0.7,
    regex: re(
      phrases([
        "marking a (?:pivotal|crucial|key|turning) (?:moment|point)",
        "setting the stage for",
        "the future looks bright",
        "exciting times (?:lie )?ahead",
        "continues to thrive",
        "an? indelible mark",
        "marqu(?:e|ant) un tournant",
        `l${A}avenir s${A}annonce (?:prometteur|radieux|brillant)`,
        "laisse une empreinte indélébile",
      ]),
    ),
  },

  // §22 : résidus de chatbot, le signe le plus sûr du catalogue
  {
    kind: "residue",
    confidence: 0.9,
    regex: re(
      phrases([
        "i hope (?:this|that|it) helps[!.]?",
        `${START}great question[!.]?`,
        `you${A}re absolutely right[!.]?`,
        "(?:of course|certainly|absolutely)!",
        "let me know if (?:you|there)[^.!?]*[.!?]?",
        "would you like me to[^.!?]*\\??",
        `j${A}espère que (?:cela|ça) vous aide[!.]?`,
        `${START}excellente question[ !.]*`,
        `n${A}hésitez pas à me (?:demander|dire|faire savoir)[^.!?]*[.!?]?`,
        "souhaitez-vous que je[^.!?]*\\??",
        "bien sûr ?!",
      ]),
    ),
  },

  // §23 : limites de connaissance et suppositions
  {
    kind: "disclaimer",
    confidence: 0.8,
    regex: re(
      phrases([
        "as of my (?:last|latest) (?:knowledge|training)(?: update| cutoff)?",
        "up to my last training update",
        "based on (?:the )?(?:available|provided) (?:information|sources)",
        "(?:is|are) not (?:publicly|widely) (?:available|documented|disclosed)",
        "in the (?:provided|available) sources",
        "selon les informations disponibles",
        `d${A}après mes dernières données`,
        "à la date de ma dernière mise à jour",
        `n${A}est pas (?:publiquement|largement) (?:disponible|documentée?)`,
        "ne sont pas (?:publiquement|largement) (?:disponibles|documentées?)",
      ]),
    ),
  },

  // §4 : préambule qui annonce le propos au lieu de le tenir
  {
    kind: "runup",
    confidence: 0.6,
    regex: re(
      phrases([
        `let${A}s (?:dive in(?:to)?|explore|break (?:this|it) down)`,
        `here${A}s what you need to know`,
        "without further ado",
        `here${A}s the thing`,
        `let${A}s be honest`,
        "real talk",
        "plongeons(?:-nous)? (?:dans|au cœur)",
        "entrons dans le vif du sujet",
        `voici ce qu${A}il faut savoir`,
        "soyons honnêtes",
        "sans plus attendre",
      ]),
    ),
  },

  // §5 : réponse à une objection que personne n'a faite
  {
    kind: "straw",
    confidence: 0.55,
    regex: re(
      `${START}(?:to be clear|soyons clairs|entendons-nous bien)(?!${L})|` +
        phrases([
          `don${A}t get me wrong`,
          `i${A}m not saying`,
          "this is not to say",
          "a tempting approach would be",
          "one might be tempted to",
          "ne vous méprenez pas",
          "je ne dis pas que",
          `il serait tentant d(?:e |${A})`,
        ]),
    ),
  },

  // §3 : formules qui sonnent profond sans rien ajouter
  {
    kind: "saying",
    confidence: 0.6,
    regex: re(
      phrases([
        "at its core",
        "the real question is",
        "what really matters is",
        "the heart of the matter",
        "the deeper issue",
        "la vraie question (?:est|reste)",
        "ce qui compte vraiment",
        "au cœur du (?:problème|débat|sujet)",
      ]),
    ),
  },

  // §2 : phrases de clôture qui répètent le propos
  {
    kind: "closer",
    confidence: 0.7,
    regex: re(
      phrases([
        `that${A}s the real win[!.]?`,
        "that is the real win[!.]?",
        "let that sink in[!.]?",
        "read that again[!.]?",
        "that distinction matters[!.]?",
        "voilà le vrai gain[!.]?",
        `c${A}est là toute la différence[!.]?`,
        "tout est dit[!.]?",
      ]),
    ),
  },
];

/** Explication affichée, avec le conseil de réécriture du catalogue. */
export const HUMANIZER_EXPLANATION: Record<HumanizerKind, string> = {
  "split-contrast":
    "Contraste « pas X mais Y » : la partie négative nomme une idée que personne n'a avancée et ne fait que donner du poids à la suite. Énoncez directement l'idée positive.",
  inflated:
    "Signification gonflée : un fait ordinaire est présenté comme un tournant ou une promesse d'avenir. Gardez le fait, retirez l'emphase.",
  residue:
    "Résidu de conversation avec un assistant (formule d'accueil, de politesse ou de clôture), l'un des signes les plus sûrs. Retirez l'enveloppe et gardez le contenu.",
  disclaimer:
    "Formule sur les limites des sources ou des connaissances, typique d'un assistant. Dites ce que la source ne montre pas, ou supprimez la phrase.",
  runup: "Préambule qui annonce le propos au lieu de le tenir. Supprimez l'amorce et commencez par l'information.",
  straw: "Réponse à une objection que le texte n'a pas formulée. Supprimez la défense, ou formulez l'affirmation qu'elle contient.",
  saying: "Formule qui sonne profond sans rien préciser. Remplacez-la par l'affirmation concrète.",
  closer: "Phrase de clôture qui répète ce qui vient d'être dit. Coupez-la, sauf si elle apporte un fait ou une conséquence nouvelle.",
};

/** Motifs dont la suppression laisse un texte correct : une suggestion « Supprimer » est proposée. */
export const HUMANIZER_REMOVABLE: ReadonlySet<HumanizerKind> = new Set(["residue", "runup", "closer"]);
