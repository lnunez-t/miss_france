import { NotifyProvider } from './components/ui'
import { GameProvider } from './lib/store'
import { Admin } from './screens/Admin'
import { PlayerApp } from './screens/PlayerApp'
import { Tv } from './screens/Tv'

export function App() {
  const path = window.location.pathname.replace(/\/+$/, '')
  const Screen = path === '/tv' ? Tv : path === '/admin' ? Admin : PlayerApp
  if (path === '/tv') document.body.classList.add('is-tv')
  return (
    <GameProvider>
      <NotifyProvider>
        <Screen />
      </NotifyProvider>
    </GameProvider>
  )
}
