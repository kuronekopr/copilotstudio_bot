import React from 'react';
import SatisfactionVote from './SatisfactionVote';
import { ANSWER_TYPES } from '../../hooks/useChatStateMachine';

const ResponseDisplay = ({ activity, onVote, onOptionSelect }) => {
    // Determine answer type
    // If activity.value does not exist, treat as simple text message (fallback to AUTO_RESOLVE style)
    const answerType = activity.value?.answerType || ANSWER_TYPES.AUTO_RESOLVE;
    const data = activity.value || {};
    const text = activity.text || '';

    // Handle standard text message
    if (!activity.value && text) {
        return (
            <div className="response-container">
                <div className="response-text">{text}</div>
            </div>
        );
    }

    switch (answerType) {
        case ANSWER_TYPES.AUTO_RESOLVE:
            return (
                <div className="response-container auto-resolve">
                    <div className="check-mark-circle">✓</div>
                    <div className="response-content">
                        <div className="response-text">{text}</div>
                        {data.faqLinks && data.faqLinks.length > 0 && (
                            <ul className="faq-links">
                                {data.faqLinks.map((link, idx) => (
                                    <li key={idx}>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                                            {link.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <SatisfactionVote onVote={(vote) => onVote(activity.id, vote)} hasVoted={data.hasVoted} />
                    </div>
                </div>
            );

        case ANSWER_TYPES.ASK_CLARIFICATION:
            return (
                <div className="response-container clarification">
                    <div className="response-text">{text}</div>
                    {data.options && (
                        <div className="clarification-options">
                            {data.options.map((option, idx) => (
                                <button key={idx} className="option-btn" onClick={() => onOptionSelect(option)}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );

        case ANSWER_TYPES.ESCALATE:
            return (
                <div className="response-container escalate">
                    <div className="escalate-icon">📞</div>
                    <div className="response-content">
                        <div className="response-text">{text}</div>
                        <div className="escalate-info">
                            担当者に転送します。<br />
                            少々お待ちください...
                        </div>
                    </div>
                </div>
            );

        default:
            return <div className="response-text">{text}</div>;
    }
};

export default ResponseDisplay;
