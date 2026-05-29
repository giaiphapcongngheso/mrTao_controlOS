import { Link, useRouter } from '@tanstack/react-router';

type ForbiddenPageProps = {
  title?: string;
  description?: string;
  backText?: string;
  homeText?: string;
  homePath?: string;
};

export function ForbiddenPage({
  title = 'Không có quyền',
  description = 'Xin lỗi, bạn không có quyền truy cập trang này.',
  backText = '← Trở lại',
  homeText = 'Về trang chủ',
  homePath = '/',
}: ForbiddenPageProps) {
  const router = useRouter();

  return (
    <main className="grid h-screen place-items-center bg-gray-900 px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-indigo-400">403</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-white sm:text-7xl">
          {title}
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
          {description}
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <button
            onClick={() => router.history.back()}
            className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            {backText}
          </button>
          <Link to={homePath} className="text-sm font-semibold text-white">
            {homeText} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
