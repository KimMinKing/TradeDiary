import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownContent = ({ children, className = '' }) => {
  const classes = ['markdown-content', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children ?? ''}</ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
