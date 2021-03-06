import { cleanup, fireEvent, wait } from '@testing-library/react';
import { LongviewClient } from 'linode-js-sdk/lib/longview';
import * as React from 'react';
import { reactRouterProps } from 'src/__data__/reactRouterProps';
import { accountSettingsFactory } from 'src/factories/accountSettings';
import { longviewClientFactory } from 'src/factories/longviewClient';
import { renderWithTheme } from 'src/utilities/testHelpers';
import {
  CombinedProps,
  filterLongviewClientsByQuery,
  LongviewClients,
  sortClientsBy,
  sortFunc
} from './LongviewClients';

afterEach(cleanup);

jest.mock('../request');
jest.mock('./LongviewClientRow');

const clients = longviewClientFactory.buildList(5);

const arrayToData = (data: any[]): Record<string, LongviewClient> => {
  return data.reduce((accum, thisItem) => {
    accum[thisItem.id] = thisItem;
    return accum;
  }, {});
};

const props: CombinedProps = {
  longviewClientsData: arrayToData(clients),
  longviewClientsError: {},
  longviewClientsLastUpdated: 0,
  longviewClientsLoading: false,
  longviewClientsResults: clients.length,
  createLongviewClient: jest.fn().mockResolvedValue({}),
  deleteLongviewClient: jest.fn(),
  getLongviewClients: jest.fn().mockResolvedValue([]),
  updateLongviewClient: jest.fn(),
  enqueueSnackbar: jest.fn(),
  closeSnackbar: jest.fn(),
  subscriptionsData: [],
  accountSettingsLoading: false,
  accountSettingsError: {},
  accountSettingsLastUpdated: 0,
  lvClientData: {},
  updateAccountSettings: jest.fn(),
  updateAccountSettingsInStore: jest.fn(),
  requestAccountSettings: jest.fn(),
  userCanCreateClient: true,
  ...reactRouterProps
};

describe('Utility Functions', () => {
  it('should properly filter longview clients by query', () => {
    expect(filterLongviewClientsByQuery('client-1', clients, {})).toEqual([
      clients[1]
    ]),
      expect(filterLongviewClientsByQuery('client', clients, {})).toEqual(
        clients
      ),
      expect(filterLongviewClientsByQuery('(', clients, {})).toEqual([]),
      expect(filterLongviewClientsByQuery(')', clients, {})).toEqual([]),
      expect(filterLongviewClientsByQuery('fdsafdsafsdf', clients, {})).toEqual(
        []
      );
  });

  describe('Sorting helpers', () => {
    describe('sortFunc helper', () => {
      it('should handle basic sorting logic', () => {
        expect([4, 5, 3, 1, 2].sort(sortFunc)).toEqual([5, 4, 3, 2, 1]);
        expect(['d', 'c', 'a', 'e', 'b'].sort(sortFunc)).toEqual([
          'e',
          'd',
          'c',
          'b',
          'a'
        ]);
      });

      it('should respect the optional order argument', () => {
        expect([4, 3, 5, 1, 2].sort((a, b) => sortFunc(a, b, 'asc'))).toEqual([
          1,
          2,
          3,
          4,
          5
        ]);

        expect(
          ['d', 'c', 'a', 'e', 'b'].sort((a, b) => sortFunc(a, b, 'desc'))
        ).toEqual(['e', 'd', 'c', 'b', 'a']);
      });
    });
    describe('sortClientsBy', () => {
      it('should sort correctly by CPU percentage', () => {
        expect(sortClientsBy('CPU' as any, [], {})).toEqual([]);
      });
    });
  });
});

describe('Longview clients list view', () => {
  it('should request clients on load', () => {
    renderWithTheme(<LongviewClients {...props} />);
    expect(props.getLongviewClients).toHaveBeenCalledTimes(1);
  });

  it('should have an Add a Client button', () => {
    const { queryByText } = renderWithTheme(<LongviewClients {...props} />);
    expect(queryByText('Add a Client')).toBeInTheDocument();
  });

  it('should attempt to create a new client when the Add a Client button is clicked', async () => {
    const { getByText } = renderWithTheme(<LongviewClients {...props} />);
    const button = getByText('Add a Client');
    fireEvent.click(button);
    await wait(() => expect(props.createLongviewClient).toHaveBeenCalledWith());
  });

  it('should render a row for each client', () => {
    const { queryAllByTestId } = renderWithTheme(
      <LongviewClients {...props} />
    );
    expect(queryAllByTestId('longview-client-row')).toHaveLength(
      clients.length
    );
  });

  it('should render a CTA for non-Pro subscribers', () => {
    const settings = accountSettingsFactory.build();
    const { getByText } = renderWithTheme(
      <LongviewClients {...props} accountSettings={settings} />
    );

    getByText(/upgrade to longview pro/i);
  });

  it('should not render a CTA for LV Pro subscribers', () => {
    const settings = accountSettingsFactory.build({
      longview_subscription: 'longview-100'
    });
    const { queryAllByText } = renderWithTheme(
      <LongviewClients {...props} accountSettings={settings} />
    );

    expect(queryAllByText(/upgrade to longview pro/i)).toHaveLength(0);
  });
});
