/**
 * LexiLens Qualitative Risk Engine
 * Analyzes text for specific user risks without scoring.
 */

const ANALYSIS_RULES = [
    // --- RED FLAGS (CRITICAL RISKS) ---
    {
        id: 'data_selling',
        severity: 'CRITICAL',
        type: 'Data Risk',
        regex: /(sell|sold|share|shared|trade|rent|exchange|monetize).{0,100}(third|partner|advertiser|affiliate|external|entity|entities)/i,
        title: "Personal Data Selling",
        explanation: "Your data can be sold to advertisers/third-parties for profit."
    },
    {
        id: 'auto_payments',
        severity: 'CRITICAL',
        type: 'Money Risk',
        regex: /(automatic|recurring).{0,50}(charge|payment|debit).{0,100}(without\s+benefit\s+of\s+notice|without\s+prior\s+notice|no\s+notice)/i,
        title: "Hidden Automatic Payments",
        explanation: "You may be charged automatically without warning."
    },
    {
        id: 'strict_no_refunds',
        severity: 'CRITICAL',
        type: 'Money Risk',
        regex: /(no\s+refund|non-refundable|all\s+sales\s+are\s+final).{0,100}(under\s+any\s+condition|whatsoever|no\s+exceptions)/i,
        title: "Strict No Refund Policy",
        explanation: "You will not get your money back under any circumstances."
    },
    {
        id: 'zero_responsibility',
        severity: 'CRITICAL',
        type: 'Legal Risk',
        regex: /(disclaim|waive|release).{0,100}(all|any|total).{0,50}(liability|responsibility|warranty|damages)/i,
        title: "Zero Company Responsibility",
        explanation: "They take no responsibility even if they cause you harm/loss."
    },

    // --- ORANGE FLAGS (CAUTION) ---
    {
        id: 'limited_sharing',
        severity: 'CAUTION',
        type: 'Data Risk',
        regex: /(share|access).{0,100}(analytics|service\s+providers|processors).{0,100}(purpose|only|strictly)/i,
        title: "Limited Data Sharing",
        explanation: "Data is shared for operations (analytics/hosting), which is standard."
    },
    {
        id: 'non_refundable',
        severity: 'CAUTION',
        type: 'Money Risk',
        regex: /(subscription|fee|charge).{0,50}(non-refundable)/i,
        title: "Non-Refundable Fees",
        explanation: "Standard cancellation policy: Fees already paid are not returned."
    },
    {
        id: 'arbitration',
        severity: 'CAUTION',
        type: 'Legal Risk',
        regex: /(binding|mandatory).{0,50}(arbitration|waiver).{0,50}(class\s+action)/i,
        title: "Mandatory Arbitration",
        explanation: "You waive your right to sue in court (Standard in US Tech)."
    },
    {
        id: 'termination_right',
        severity: 'CAUTION',
        type: 'Account Risk',
        regex: /(terminate|suspend).{0,100}(account|access).{0,100}(sole\s+discretion)/i,
        title: "Termination Rights",
        explanation: "They can ban your account if you violate terms."
    },

    // --- GREEN FLAGS (SAFE) ---
    {
        id: 'no_sell_guarantee',
        severity: 'SAFE',
        type: 'Data Safety',
        regex: /(we|company).{0,50}(not|never|no).{0,50}(sell|share|trade|rent|distribute).{0,50}(data|info)/i,
        title: "No Data Selling Guaranteed",
        explanation: "Explicit promise: 'We do not sell your data'."
    },
    {
        id: 'user_ownership',
        severity: 'SAFE',
        type: 'User Rights',
        regex: /(you|user).{0,50}(retain|own|control).{0,50}(ownership|rights|content)/i,
        title: "You Own Your Data",
        explanation: "You keep full ownership of content you upload."
    }
];

class RiskAnalyzer {
    analyze(text) {
        let findings = [];
        const seenIds = new Set();

        // 1. Scan Text vs Rules
        ANALYSIS_RULES.forEach(rule => {
            if (rule.regex.test(text)) {
                if (!seenIds.has(rule.id)) {
                    findings.push(rule);
                    seenIds.add(rule.id);
                }
            }
        });

        // 1b. Conflict Resolution (Safeguards suppress Risks)
        // If we found "No Data Selling" (Safe), remove "Data Selling" (Critical) 
        const safeIds = new Set(findings.map(f => f.id));
        
        if (safeIds.has('no_sell_guarantee')) {
            const index = findings.findIndex(f => f.id === 'data_selling');
            if (index !== -1) {
                findings.splice(index, 1);
            }
        }

        // 2. Sort Findings by Severity first (CRITICAL > CAUTION > SAFE)
        const priority = { 'CRITICAL': 3, 'CAUTION': 2, 'SAFE': 1, 'INFO': 0 };
        findings.sort((a, b) => priority[b.severity] - priority[a.severity]);

        // 3. Select Top 5 with Deduplication
        const top5 = [];
        const usedTypes = new Set();
        const usedIds = new Set(); 

        // Pass 1: Pick the highest severity item for each unique Type
        findings.forEach(f => {
            if (!usedTypes.has(f.type) && top5.length < 5) {
                top5.push(f);
                usedTypes.add(f.type);
                usedIds.add(f.id);
            }
        });

        // Pass 2: Fill remaining slots
        if (top5.length < 5) {
            findings.forEach(f => {
                if (!usedIds.has(f.id) && top5.length < 5) {
                    top5.push(f);
                    usedIds.add(f.id);
                }
            });
        }

        // Fill with generic info if still < 5
        while (top5.length < 5) {
             const fillers = [
                { title: "Standard Guidelines", explanation: "General usage rules apply.", type: "General Info" },
                { title: "Copyright Terms", explanation: "Standard intellectual property clauses.", type: "General Info" },
                { title: "Governing Law", explanation: "Terms governed by local laws.", type: "General Info" }
            ];
            let fillerIndex = (5 - top5.length) % fillers.length; 
            top5.push({
                ...fillers[fillerIndex],
                severity: "INFO"
            });
        }

        // 4. Generate Verdict
        const hasRed = findings.some(f => f.severity === 'CRITICAL');
        const hasOrange = findings.some(f => f.severity === 'CAUTION');

        let verdict = {
            title: "Safe to Install",
            color: "green",
            reason: "No major risks identified."
        };

        if (hasRed) {
            const redItem = findings.find(f => f.severity === 'CRITICAL');
            verdict = {
                title: "Not Recommended",
                color: "red",
                reason: redItem.title + " detected."
            };
        } else if (hasOrange) {
             verdict = {
                title: "Install with Caution",
                color: "orange",
                reason: "Standard risks found (e.g. Arbitration / No Refunds)."
            };
        }

        return {
            points: top5,
            verdict: verdict
        };
    }
}

if (typeof window !== "undefined") {
    window.LexiLensAnalyzer = RiskAnalyzer;
}
