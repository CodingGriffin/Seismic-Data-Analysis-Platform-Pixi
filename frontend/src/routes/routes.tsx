import RootLayout from '../layouts/root'
import PicksPage from '../page/picks/picks'
import DisperPage from '../page/disper/disper'

export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'picks',
        element: <PicksPage />
      },
      {
        path: 'disper',
        element: <DisperPage />
      }
    ]
  }
];