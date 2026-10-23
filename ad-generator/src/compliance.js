// Meta health-ad guardrails, applied to every piece of copy and to all text rendered on each image.

export const LIMITS = { primary: 125, headline: 40 };
export const CTAS = ['Book Now', 'Learn More', 'Get Offer'];

const RULES = [
  [/\b(ozempic|wegovy|mounjaro|zepbound|rybelsus|saxenda)\b/i, 'brand-name drug (say "GLP-1 medication", "semaglutide" or "tirzepatide")'],
  [/\b\d+\s*(\+\s*)?(lbs?|pounds?|kgs?|kilos?|dress sizes?|inches)\b/i, 'weight-loss amount claim'],
  [/\b(lose|drop|shed|melt)\b[^.]{0,30}\b(fast|quick(ly)?|rapid(ly)?)\b/i, '"lose weight fast" style claim'],
  [/\b(in|within|by)\s+(just\s+)?(\d+|a few|one|two|three|four|six|eight|twelve)\s+(days?|weeks?|months?)\b/i, 'results timeline'],
  [/\b(before\s*(&|and|\/)\s*after|transformation)\b/i, 'before/after framing'],
  [/\b(summer body|beach body|bikini|wedding|vacation|swimsuit|holiday body)\b/i, 'event/season body hook'],
  [/\b(fat|flab(by)?|belly|muffin top|love handles|obese|obesity|overweight|chubby|ugly|embarrass\w*)\b/i, 'body-shaming / personal-attribute language'],
  [/\b(guarantee[ds]?|miracle|cure[ds]?|effortless|no diet)\b/i, 'guarantee / miracle claim'],
  [/\b(scale|tape measure)\b/i, 'scale / tape-measure imagery reference'],
];

export function lint(text) {
  return RULES.filter(([re]) => re.test(text)).map(([re, why]) => `${why}: "${text.match(re)[0]}"`);
}
