type PaginationType<T> = {
  data: T[],
  pagination: {
    cursor: string,
  } | null,
};

export default PaginationType;
