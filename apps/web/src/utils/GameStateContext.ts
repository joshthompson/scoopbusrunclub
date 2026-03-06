import { createContext, useContext } from "solid-js"
import { SetStoreFunction } from "solid-js/store"
import {
  Achievement,
  AchievementDisplayDuration,
  AchievementsRecord,
} from '@/game/freediver/data/Achievements'
import { Locale } from "@/game/freediver/data/Translations"
import { LevelName, OCEAN } from "@/game/freediver/scene/levels/data"

export interface GameState {
  score: {
    total: number
    currentDive: number
    maxDive: number
  }
  diver: {
    x: number
    oxygen: number
    showDamage: boolean
    showHeal: boolean
    level: LevelName
  }
  options: {
    locale: Locale
    debug: boolean
    volume: number
  }
  questState: {
    cow: {
      state: 'waiting' | 'following' | 'lost' | 'reunited',
      x: number
    },
    cave: {
      state: 'open' | 'closed',
    },
    corgi: {
      bones: (number | 'delivered')[] // -1 for not found, otherwise the find order
      delivered: number
      open: boolean
    }
  }
  achievements: AchievementsRecord
}

declare global {
  interface Window {
    gameState?: GameState
    setGameState?: SetStoreFunction<GameState>
  }
}

const baseState: GameState = {
  score: {
    total: 0,
    currentDive: 0,
    maxDive: 0,
  },
  diver: {
    x: 0,
    oxygen: 100,
    showDamage: false,
    showHeal: false,
    level: 'ocean',
  },
  options: {
    locale: 'en',
    volume: 1,
    debug: import.meta.env.DEV,
  },
  achievements: {},
  questState: {
    cow: {
      state: 'waiting',
      x: OCEAN.minX + 500,
    },
    cave: {
      state: 'closed',
    },
    corgi: {
      // bones: [1,2,3,4,5,6,7,8,9,0],
      bones: Array(10).fill(-1),
      delivered: 0,
      open: false
    }
  },
}

export function initialState(): GameState {
  const loadedState = loadState()
  const state = {
    score: {
      ...baseState.score,
      ...loadedState.score,
      currentDive: 0,
    },
    diver: {
      ...baseState.diver,
      ...loadedState.diver,
      oxygen: 100,
      showDamage: false,
      showHeal: false,
    },
    options: {
      ...baseState.options,
      ...loadedState.options,
      debug: import.meta.env.DEV,
    },
    questState: {
      ...baseState.questState,
      ...loadedState.questState,
    },
    achievements: Object.fromEntries(
      Object.entries((loadedState.achievements ?? {}))
          .map(([key, value]) => [key as Achievement, value === 'new' ? 'shown' : value])
    ) as AchievementsRecord
  }
  return state
}

export function setGameStateWithSaveWrapper(
  gameState: GameState,
  setGameState: SetStoreFunction<GameState>
) {
  return ((...args: any[]) => {
    (setGameState as any)(...args)
    saveState(gameState)
  }) as any as SetStoreFunction<GameState>
}

const saveFrequency = 5000
let lastSaved = 0
export const saveState = (gameState: GameState, forceSave = false) => {
  if (Date.now() - lastSaved > saveFrequency || forceSave) {
    window.localStorage.setItem('game-state', JSON.stringify(gameState satisfies GameState))
    lastSaved = Date.now()
  }
}

export const loadState = (): GameState => {
  return JSON.parse(window.localStorage.getItem('game-state') ?? '{}')
}

export const GameStateContext = createContext<[GameState, SetStoreFunction<GameState>]>()
export type GameStateActions = NonNullable<ReturnType<typeof useGameState>>['gameStateActions']

export const useGameState = () => {
  const context = useContext(GameStateContext)
  if (!context) return undefined
  
  const [gameState, setGameState] = context

  function achievement(name: Achievement) {
    if (!gameState.achievements[name]) {
      setGameState('achievements', name, 'new')
      setTimeout(() => {
        setGameState('achievements', name, 'shown')
      }, AchievementDisplayDuration)
      return true
    } else {
      return false
    }
  }

  function score(points: number) {
    setGameState('score', 'currentDive', (score) => score + points)
  }

  return {
    gameState,
    setGameState,
    gameStateActions: {
      score,
      achievement,
      registerCurrentDive: () => {
        setGameState('score', (state) => {
          const newTotal = state.total + state.currentDive
          const newMaxDive = Math.max(state.maxDive, state.currentDive)

          if (state.currentDive >= 15) achievement('dive15')
          if (state.currentDive >= 30) achievement('dive30')
          if (newTotal >= 100) achievement('total100')

          return {
            ...state,
            total: newTotal,
            maxDive: newMaxDive,
          }
        })
      },
      toggleVolume: () => {
        const on = gameState.options.volume > 0
        const audioElements = document.querySelectorAll<HTMLAudioElement>('audio[data-game-volume]')
        audioElements.forEach(audio => {
          audio.volume = on ? 0 : parseFloat(audio.getAttribute('data-game-volume')!)
        })
        setGameState('options', 'volume', on ? 0 : 1)
      },
      clearGameData: () => {
        setGameState((prev) => ({
          ...baseState,
          options: prev.options
        }))
      },
      toggleLanguage: () => {
        const nextLocale: Record<Locale, Locale> = {
          en: 'ru',
          ru: 'sv',
          sv: 'fl',
          fl: 'en',
        }
        setGameState('options', 'locale', nextLocale[gameState.options.locale])
        achievement('bilingual')
      },
      damage: (amount: number) => {
        setGameState('diver', 'oxygen', oxygen => Math.max(0, oxygen - amount))
        setGameState('diver', 'showDamage', true)
      },
      heal: (amount: number) => {
        setGameState('diver', 'oxygen', oxygen => Math.min(100, oxygen + amount))
        setGameState('diver', 'showHeal', true)
      },
      claimBone: (n: number) => {
        score(1)
        const totalBonesFound = gameState.questState.corgi.bones.filter(b => b !== -1).length
        const delivered = gameState.questState.corgi.delivered
        const nextBoneNumber = totalBonesFound - delivered
        setGameState('questState', 'corgi', 'bones', n, nextBoneNumber)
        return nextBoneNumber
      },
      depositBone: (n: number) => {
        const prev = gameState.questState.corgi.bones[n]
        setGameState('questState', 'corgi', 'bones', bones => bones.map(
          (bone, i) => i === n
            ? 'delivered'
            : typeof bone === 'number' && typeof prev === 'number' && bone !== -1 && bone > prev
              ? bone - 1
              : bone
        ))
        setGameState('questState', 'corgi', 'delivered', prev => prev + 1)
        if (gameState.questState.corgi.delivered === gameState.questState.corgi.bones.length) {
          achievement('statue')
          setGameState('questState', 'corgi', 'open', true)
        }
      },
      blackout: () => {
        setGameState('score', 'currentDive', 0)
        setGameState('diver', 'x', 0)
        setGameState('diver', 'level', 'ocean')
        achievement('blackout')
      },
    }
  }
}