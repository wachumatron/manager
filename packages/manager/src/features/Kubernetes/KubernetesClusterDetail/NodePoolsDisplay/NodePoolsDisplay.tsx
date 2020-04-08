import * as React from 'react';
import { useSelector } from 'react-redux';
import AddNewLink from 'src/components/AddNewLink';
import Paper from 'src/components/core/Paper';
import { makeStyles, Theme } from 'src/components/core/styles';
import Typography from 'src/components/core/Typography';
import ErrorState from 'src/components/ErrorState';
import Grid from 'src/components/Grid';
import { ExtendedType } from 'src/features/linodes/LinodesCreate/SelectPlanPanel';
import { useDialog } from 'src/hooks/useDialog';
import { ApplicationState } from 'src/store';
import { getAPIErrorOrDefault } from 'src/utilities/errorUtils';
import { PoolNodeWithPrice } from '../../types';
import AddNodePoolDrawer from '../AddNodePoolDrawer';
import ResizeNodePoolDrawer from '../ResizeNodePoolDrawer';
import NodePool from './NodePool';
import NodePoolDialog from './NodePoolDialog';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    padding: theme.spacing(3)
  },
  displayTable: {
    width: '100%',
    '& > div': {
      marginTop: theme.spacing(),
      marginBottom: theme.spacing(4)
    },
    '& > div:last-child': {
      marginBottom: 0
    }
  },
  nodePoolHeader: {
    marginBottom: theme.spacing()
  },
  nodePoolHeaderOuter: {
    display: 'flex',
    alignItems: 'center'
  },
  nodePool: {
    marginTop: theme.spacing(),
    marginBottom: theme.spacing(4)
  }
}));

export interface Props {
  pools: PoolNodeWithPrice[];
  types: ExtendedType[];
  updatePool: (
    poolID: number,
    updatedPool: PoolNodeWithPrice
  ) => Promise<PoolNodeWithPrice>;
  deletePool: (poolID: number) => Promise<any>;
  addNodePool: (newPool: PoolNodeWithPrice) => Promise<PoolNodeWithPrice>;
}

export const NodePoolsDisplay: React.FC<Props> = props => {
  const { pools, types, updatePool, addNodePool, deletePool } = props;

  const classes = useStyles();

  const {
    dialog,
    openDialog,
    closeDialog,
    submitDialog,
    handleError
  } = useDialog<number>(deletePool);

  const [drawerOpen, setDrawerOpen] = React.useState<boolean>(false);
  const [addDrawerOpen, setAddDrawerOpen] = React.useState<boolean>(false);
  const [resizeDrawerOpen, setResizeDrawerOpen] = React.useState<boolean>(
    false
  );
  const [drawerSubmitting, setDrawerSubmitting] = React.useState<boolean>(
    false
  );
  const [drawerError, setDrawerError] = React.useState<string | undefined>();
  const [poolForEdit, setPoolForEdit] = React.useState<
    PoolNodeWithPrice | undefined
  >();

  const handleOpenResizeDrawer = (poolID: number) => {
    setPoolForEdit(pools.find(thisPool => thisPool.id === poolID));
    setDrawerOpen(true);
    setDrawerError(undefined);
  };

  const handleResize = (updatedCount: number) => {
    // Should never happen, just a safety check
    if (!poolForEdit) {
      return;
    }
    setDrawerSubmitting(true);
    setDrawerError(undefined);
    updatePool(poolForEdit.id, { ...poolForEdit, count: updatedCount })
      .then(_ => {
        setDrawerSubmitting(false);
        setDrawerOpen(false);
      })
      .catch(error => {
        setDrawerSubmitting(false);
        setDrawerError(
          getAPIErrorOrDefault(error, 'Error resizing Node Pool')[0].reason
        );
      });
  };

  const handleDelete = () => {
    if (!dialog.entityID) {
      return;
    }
    submitDialog(dialog.entityID).catch(err => {
      handleError(
        getAPIErrorOrDefault(err, 'Error deleting this Node Pool.')[0].reason
      );
    });
  };

  /**
   * If the API returns an error when fetching node pools,
   * we want to display this error to the user from the
   * NodePoolDisplayTable.
   *
   * Only do this if we haven't yet successfully retrieved this
   * data, so a random error in our subsequent polling doesn't
   * break the view.
   */
  const poolsError = useSelector((state: ApplicationState) => {
    const error = state.__resources.nodePools?.error?.read;
    const lastUpdated = state.__resources.nodePools.lastUpdated;
    if (error && lastUpdated === 0) {
      return getAPIErrorOrDefault(error, 'Unable to load Node Pools.')[0]
        .reason;
    }
    return undefined;
  });

  const handleOpenAddDrawer = () => {
    setAddDrawerOpen(true);
    setDrawerError(undefined);
  };

  return (
    <>
      <Grid
        container
        justify="space-between"
        alignItems="flex-end"
        updateFor={[classes]}
        style={{ paddingBottom: 0 }}
      >
        <Grid item>
          <Typography variant="h2" className={classes.nodePoolHeader}>
            Node Pools
          </Typography>
        </Grid>
        <Grid item>
          <Grid container alignItems="flex-end">
            <Grid item className="pt0">
              <AddNewLink
                onClick={() => {
                  handleOpenAddDrawer();
                }}
                label="Add a Node Pool"
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Paper className={classes.root}>
        {poolsError ? (
          <ErrorState errorText={poolsError} />
        ) : (
          <Grid container direction="column">
            <Grid item xs={12} className={classes.displayTable}>
              {pools.map(thisPool => {
                const { id, nodes } = thisPool;

                const thisPoolType = types.find(
                  thisType => thisType.id === thisPool.type
                );

                const typeLabel = thisPoolType?.label ?? 'Unknown type';

                return (
                  <div key={id} className={classes.nodePool}>
                    <NodePool
                      poolId={thisPool.id}
                      typeLabel={typeLabel}
                      nodes={nodes ?? []}
                      handleClickResize={handleOpenResizeDrawer}
                      openDeleteDialog={openDialog}
                    />
                  </div>
                );
              })}
            </Grid>
            {/* <AddNodePoolDrawer
              open={addDrawerOpen}
              onClose={() => setAddDrawerOpen(false)}
              onSubmit={addNodePool(pools[0])}
              nodePool={pools[0]}
              isSubmitting={drawerSubmitting}
              error={drawerError}
            /> */}
            <ResizeNodePoolDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              onSubmit={(updatedCount: number) => handleResize(updatedCount)}
              nodePool={poolForEdit}
              isSubmitting={drawerSubmitting}
              error={drawerError}
            />
            <NodePoolDialog
              nodeCount={
                pools.find(thisPool => thisPool.id === dialog.entityID)
                  ?.count ?? 0
              }
              onDelete={handleDelete}
              onClose={closeDialog}
              open={dialog.isOpen}
              error={dialog.error}
              loading={dialog.isLoading}
            />
          </Grid>
        )}
      </Paper>
    </>
  );
};

export default React.memo(NodePoolsDisplay);
