"""Utility functions for applying BREX rules to XML documents."""

from __future__ import annotations

from typing import Dict, List

from lxml import etree


def apply_brex_rules(xml_str: str, rules: List[Dict]) -> List[str]:
    """Evaluate BREX XPath rules against XML and return violation messages.

    Each rule should be a dictionary with ``id``, ``xpath`` and ``message`` keys.
    The rule's XPath expression is expected to select nodes that violate the
    constraint. If any nodes are returned, the corresponding message is added to
    the result list prefixed with the rule id.
    """
    try:
        tree = etree.fromstring(xml_str.encode())
    except Exception:
        return ["Invalid XML provided"]

    violations: List[str] = []
    for rule in rules:
        xpath = rule.get("xpath")
        if not xpath:
            continue
        nodes = tree.xpath(xpath)
        if nodes:
            rule_id = rule.get("id", "BREX")
            message = rule.get("message", "Rule violation")
            violations.append(f"{rule_id}: {message}")
    return violations
