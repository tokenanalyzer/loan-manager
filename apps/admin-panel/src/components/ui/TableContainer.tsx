import type { ReactNode } from 'react';

import styles from './TableContainer.module.css';

/** Themed scroll wrapper + base table styling. Pass `<thead>`/`<tbody>` as children of the inner `<table>`. */
export function TableContainer({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
