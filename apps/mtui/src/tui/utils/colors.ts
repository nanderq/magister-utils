/** Map IsVoldoende to an ink color string. */
export function gradeColor(isVoldoende: boolean | null | undefined): string {
  if (isVoldoende === true) return 'green'
  if (isVoldoende === false) return 'red'
  return 'gray'
}

/** Map assignment status to an ink color string. */
export function assignmentStatusColor(status: 'OPEN' | 'VERLOPEN' | 'GESLOTEN' | 'INGEDIEND'): string {
  switch (status) {
    case 'OPEN': return 'yellow'
    case 'VERLOPEN': return 'red'
    case 'INGEDIEND': return 'green'
    case 'GESLOTEN': return 'gray'
  }
}

/** Color for a schedule item based on its status. */
export function lessonStatusColor(cancelled: boolean): string {
  return cancelled ? 'gray' : 'white'
}
