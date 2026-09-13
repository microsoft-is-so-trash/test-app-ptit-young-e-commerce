import { Icon } from './Icon';

type WebZaloLoginLinkProps = {
  href: string;
};

/** Bản web dùng thẻ <a> điều hướng cùng tab, không gắn onClick để tránh bị chặn popup. */
export function WebZaloLoginLink({ href }: WebZaloLoginLinkProps) {
  return (
    <a className="primary-button login-oauth-link" href={href}>
      <Icon name="login" size={20} />
      Đăng nhập bằng Zalo
    </a>
  );
}
