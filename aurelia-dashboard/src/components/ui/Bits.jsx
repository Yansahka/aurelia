import { initials } from '../../lib/format';
import { stageLabel } from '../../lib/constants';
import { productImage, productPlaceholder } from '../../lib/art';

export const Avatar = ({ name, size }) => <span className="avatar" style={size ? { width: size, height: size } : undefined}>{initials(name)}</span>;
export const Thumb = ({ product }) => <span className="thumb"><img src={productImage(product)} alt="" onError={e=>{e.currentTarget.src=productPlaceholder;}}/></span>;
export const StagePill = ({ status }) => <span className={'pill s-' + status}><i />{stageLabel(status)}</span>;
export const Switch = ({ on, onChange, label }) => <button type="button" role="switch" aria-checked={on} aria-label={label} className={'sw' + (on ? ' on' : '')} onClick={() => onChange(!on)} />;
export const Stars = ({ n }) => <span className="stars" aria-label={n + ' sur 5'}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
export const Skeleton = ({ h = 120 }) => <div className="skeleton" style={{ height: h }} />;
export const QueryError = ({ message, onRetry, action = 'Réessayer' }) => <div className="card query-error" role="alert"><h2>Impossible d’afficher ces données</h2><p>{message}</p><button className="btn" onClick={onRetry}>{action}</button></div>;
export const PageHead = ({ title, sub, children, underline = true }) => (
  <div className="ph"><div><h1 className={underline ? 'u' : ''}>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="acts">{children}</div>}</div>
);
