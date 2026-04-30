import { parseRegExpLiteral, visitRegExpAST } from "@eslint-community/regexpp";
import type { AST } from "@eslint-community/regexpp";
import type { RegExpSyntaxError } from "@eslint-community/regexpp/regexp-syntax-error";
import type { TokenExplanation } from "./types";

type ExplanationResult = TokenExplanation[] | { error: string; offset: number };

function charLabel(node: AST.Character): string {
  return node.raw;
}

function buildQuantifierText(elementText: string, qNode: AST.Quantifier): string {
  return qNode.raw;
}

function quantifierKey(qNode: AST.Quantifier): string {
  if (qNode.min === 0 && qNode.max === Infinity) return "explainQuantifierStar";
  if (qNode.min === 1 && qNode.max === Infinity) return "explainQuantifierPlus";
  if (qNode.min === 0 && qNode.max === 1) return "explainQuantifierQuestion";
  if (qNode.min === qNode.max) return "explainQuantifierExact";
  return "explainQuantifierRange";
}

function charSetKey(kind: string): string {
  const map: Record<string, string> = {
    digit: "explainCharSetDigit",
    space: "explainCharSetSpace",
    word: "explainCharSetWord",
    any: "explainCharSetAny",
  };
  return map[kind] || "explainCharSet";
}

function assertionKey(kind: string): string {
  const map: Record<string, string> = {
    start: "explainAnchorStart",
    end: "explainAnchorEnd",
    word: "explainBoundaryWord",
    lookahead: "explainLookahead",
    lookbehind: "explainLookbehind",
  };
  return map[kind] || "explainAssertion";
}

export function explainPattern(pattern: string, flags: string): ExplanationResult {
  if (!pattern) return [];

  let ast: AST.RegExpLiteral;
  try {
    ast = parseRegExpLiteral(`/${pattern}/${flags || "g"}`);
  } catch (e: unknown) {
    const err = e as RegExpSyntaxError & { index?: number };
    return {
      error: err.message,
      offset: err.index ?? 0,
    };
  }

  const tokens: TokenExplanation[] = [];

  function pushToken(
    node: AST.Node,
    text: string,
    key: string,
    params?: Record<string, string | number>
  ) {
    tokens.push({
      text,
      start: node.start,
      end: node.end,
      explanationKey: key,
      params,
    });
  }

  function handleAlternative(alt: AST.Alternative): void {
    for (const el of alt.elements) {
      processElement(el);
    }
  }

  function getNodeText(node: AST.Node): string {
    // regexpp positions are relative to /pattern/flags — offset by 1 for the leading /
    return pattern.slice(node.start - 1, node.end - 1);
  }

  function processElement(node: AST.Node): void {
    const text = getNodeText(node);

    switch (node.type) {
      case "Character": {
        if (tokens.length > 0 && tokens[tokens.length - 1].explanationKey === "explainLiteral") {
          const prev = tokens[tokens.length - 1];
          tokens[tokens.length - 1] = {
            text: prev.text + text,
            start: prev.start,
            end: node.end,
            explanationKey: "explainLiteral",
            params: { literal: prev.text + text },
          };
        } else {
          pushToken(node, text, "explainLiteral", { literal: text });
        }
        break;
      }

      case "CharacterSet": {
        pushToken(node, text, charSetKey(node.kind), { kind: node.kind });
        break;
      }

      case "CharacterClass": {
        pushToken(node, text, "explainCharClass", { range: text });
        break;
      }

      case "Quantifier": {
        const qNode = node as AST.Quantifier;
        const elementText = getNodeText(qNode.element);
        const qKey = quantifierKey(qNode);
        const params: Record<string, string | number> = {
          min: qNode.min,
          max: qNode.max === Infinity ? "unlimited" : qNode.max,
        };
        if (!qNode.greedy) {
          params.suffix = "lazySuffix";
        }
        pushToken(node, buildQuantifierText(elementText, qNode), qKey, params);
        break;
      }

      case "CapturingGroup":
      case "Group": {
        const name =
          node.type === "CapturingGroup" ? ((node as AST.CapturingGroup).name ?? "") : "";
        pushToken(
          node,
          text,
          name ? "explainGroupNamed" : "explainGroup",
          name ? { name } : undefined
        );
        for (const alt of node.alternatives) {
          handleAlternative(alt);
        }
        break;
      }

      case "Assertion": {
        pushToken(node, text, assertionKey(node.kind), { kind: node.kind });
        break;
      }

      case "Backreference": {
        pushToken(node, text, "explainBackreference", { ref: node.ref });
        break;
      }

      case "Alternative": {
        handleAlternative(node);
        break;
      }

      case "Pattern": {
        handleAlternative(
          node.alternatives[0] ??
            ({
              type: "Alternative",
              elements: [],
              start: 0,
              end: 0,
              parent: node,
              raw: "",
            } as AST.Alternative)
        );
        break;
      }

      default:
        break;
    }
  }

  if (ast.pattern?.alternatives?.length) {
    if (ast.pattern.alternatives.length > 1) {
      pushToken(ast.pattern, pattern, "explainAlternative");
    }
    for (const alt of ast.pattern.alternatives) {
      handleAlternative(alt);
    }
  }

  return tokens;
}
