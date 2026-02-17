import React from 'react';

const SatisfactionVote = ({ onVote, hasVoted }) => {
    if (hasVoted) {
        return <div className="satisfaction-voted">ご協力ありがとうございました</div>;
    }

    return (
        <div className="satisfaction-vote">
            <span className="vote-label">回答は役に立ちましたか？</span>
            <div className="vote-buttons">
                <button className="vote-btn up" onClick={() => onVote('positive')}>👍</button>
                <button className="vote-btn down" onClick={() => onVote('negative')}>👎</button>
            </div>
        </div>
    );
};

export default SatisfactionVote;
