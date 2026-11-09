import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { emptyProfile } from '../../server/onboarding.ts'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  it('shows a new clip on each step', () => {
    const { container } = render(<Onboarding initial={emptyProfile()} onComplete={() => {}} />)
    const active = () => container.querySelector('.onb-film [data-active="true"]')?.getAttribute('src')
    expect(active()).toContain('onboarding/step-1.mp4')
    expect(container.querySelectorAll('.onb-film video')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(active()).toContain('onboarding/step-2.mp4')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(active()).toContain('onboarding/step-1.mp4')
  })

  it('moves focus to the question on each new step', () => {
    render(<Onboarding initial={emptyProfile()} onComplete={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })

  it('closing a reopened setup keeps the answers it started with', async () => {
    const onComplete = vi.fn()
    render(<Onboarding initial={{ ...emptyProfile(), role: 'owner' }} revisit onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('radio', { name: 'I run finance' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ role: 'owner' }), null))
  })

  it('reopened from Settings it asks only the questions and ends in a save', async () => {
    const onComplete = vi.fn()
    render(<Onboarding initial={{ ...emptyProfile(), autonomy: 'show' }} revisit onComplete={onComplete} />)
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    fireEvent.click(screen.getByRole('radio', { name: /draft it for me/i }))
    fireEvent.click(screen.getByRole('button', { name: /^save/i }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ autonomy: 'draft' }), null))
    expect(screen.queryByRole('button', { name: /upload a ledger/i })).not.toBeInTheDocument()
  })
})
