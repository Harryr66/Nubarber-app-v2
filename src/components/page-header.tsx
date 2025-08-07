import { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  actionButton?: ReactNode;
};

export default function PageHeader({ title, actionButton }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold font-headline text-foreground">{title}</h1>
      {actionButton}
    </div>
  );
}
