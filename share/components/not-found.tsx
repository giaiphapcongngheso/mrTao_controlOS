import { Link, useRouter } from '@tanstack/react-router';

type NotFoundPageProps = {
  title?: string;
  description?: string;
  backText?: string;
  homeText?: string;
  homePath?: string;
  // Accept any additional props from TanStack Router
  data?: unknown;
};

export function NotFoundPage({
  title = 'Không tìm thấy trang',
  description = 'Xin lỗi, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm.',
  backText = '← Trở lại',
  homeText = 'Về trang chủ',
  homePath = '/',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data: _data,
}: NotFoundPageProps) {
  const router = useRouter();

  return (
    <main className="grid h-screen place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-primary">404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl">
          {title}
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
          {description}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <button
            onClick={() => router.history.back()}
            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {backText}
          </button>
          <Link to={homePath} className="text-sm font-semibold text-gray-700 hover:text-gray-900">
            {homeText} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
