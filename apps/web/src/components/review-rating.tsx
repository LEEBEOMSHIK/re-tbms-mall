import {reviewLabel,type ReviewSummary} from '@/lib/reviews';
export function ReviewRating({summary}:{summary:ReviewSummary}){return <span className={`shop-review-rating${summary.review_count===0?' is-empty':''}`}>{reviewLabel(summary)}</span>}
