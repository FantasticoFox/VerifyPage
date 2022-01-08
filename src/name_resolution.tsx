// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom";
import { useTable, usePagination } from "react-table";
import Alert from "react-bootstrap/Alert";
import "./assets/scss/styles.scss";

const range = (len) => {
  // Creates [0, 1, 2, ... <len>]
  return [...Array(len).keys()];
};

const newPerson = () => {
  const statusChance = Math.random();
  return {
    walletAddress: "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
    source: "local",
    firstName: "Vitalik",
    lastName: "Buterin",
    nickName: "vbuterin",
  };
};

function makeData(...lens) {
  const makeDataLevel = (depth = 0) => {
    const len = lens[depth];
    return range(len).map((d) => {
      return {
        ...newPerson(),
        subRows: lens[depth + 1] ? makeDataLevel(depth + 1) : undefined,
      };
    });
  };
  return makeDataLevel();
}

const storageKey = "data_accounting_name_resolution";

async function prepareData() {
  const d = await chrome.storage.sync.get(storageKey);
  if (!d[storageKey]) {
    return makeData(10);
  }
  const parsed = JSON.parse(d[storageKey]);
  // Convert to array
  const arrayData = Object.keys(parsed).map(k => {
    return {walletAddress: k, ...parsed[k]};
  });
  console.log(arrayData);
  return arrayData;
}

// Create an editable cell renderer
const EditableCell = ({
  value: initialValue,
  row: { index },
  column: { id },
  updateMyData, // This is a custom function that we supplied to our table instance
}) => {
  // We need to keep and update the state of the cell normally
  const [value, setValue] = React.useState(initialValue);

  //if (id === "walletAddress") {
  //  // walletAddress must be read-only.
  //  return <div>{value}</div>;
  //}

  const onChange = (e) => {
    setValue(e.target.value);
  };

  // We'll only update the external data when the input is blurred
  const onBlur = () => {
    updateMyData(index, id, value);
  };

  // If the initialValue is changed external, sync it up with our state
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return <input value={value} onChange={onChange} onBlur={onBlur} />;
};

// Set our editable cell renderer as the default Cell renderer
const defaultColumn = {
  Cell: EditableCell,
};

// Be sure to pass our updateMyData and the skipPageReset option
function Table({ columns, data, updateMyData, skipPageReset }) {
  // For this example, we're using pagination to illustrate how to stop
  // the current page from resetting when our data changes
  // Otherwise, nothing is different here.
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
      // use the skipPageReset option to disable page resetting temporarily
      autoResetPage: !skipPageReset,
      // updateMyData isn't part of the API, but
      // anything we put into these options will
      // automatically be available on the instance.
      // That way we can call this function from our
      // cell renderer!
      updateMyData,
    },
    usePagination
  );

  // Render the UI for your table
  return (
    <>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps()}>{column.render("Header")}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="pagination">
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {"<<"}
        </button>{" "}
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          {"<"}
        </button>{" "}
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          {">"}
        </button>{" "}
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {">>"}
        </button>{" "}
        <span>
          Page{" "}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{" "}
        </span>
        <span>
          | Go to page:{" "}
          <input
            type="number"
            defaultValue={pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              gotoPage(page);
            }}
            style={{ width: "100px" }}
          />
        </span>{" "}
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

const App = () => {
  const columns = React.useMemo(
    () => [
      {
        Header: "Info",
        columns: [
          {
            Header: "Account",
            accessor: "walletAddress",
          },
          {
            Header: "Source",
            accessor: "source",
          },

          {
            Header: "First Name",
            accessor: "firstName",
          },
          {
            Header: "Last Name",
            accessor: "lastName",
          },
          {
            Header: "Nick Name",
            accessor: "nickName",
          },
        ],
      },
    ],
    []
  );

  const [data, setData] = React.useState([]);
  const [skipPageReset, setSkipPageReset] = React.useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = React.useState(false);

  // We need to keep the table from resetting the pageIndex when we
  // Update data. So we can keep track of that flag with a ref.

  // When our cell renderer calls updateMyData, we'll use
  // the rowIndex, columnId and new value to update the
  // original data
  const updateMyData = (rowIndex, columnId, value) => {
    // We also turn on the flag to not reset the page
    setSkipPageReset(true);
    setData((old) =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...old[rowIndex],
            [columnId]: value,
          };
        }
        return row;
      })
    );
  };

  const onAddRowClick = () => {
    setData(
      data.concat({ username: "", email: "", gender: "", phone: "" })
    )
  }

  // After data changes, we turn the flag back off
  // so that if data actually changes when we're not
  // editing it, the page is reset
  React.useEffect(() => {
    setSkipPageReset(false);
  }, [data]);

  React.useEffect(() => {
    prepareData().then(setData);
  }, []);

  const saveData = () => {
    // Convert the array data to a hash map structure.
    // This automatically deduplicates the array based on the walletAddress.
    const hashmapData = {}
    for (const e of data) {
      const walletAddress = e.walletAddress;
      if (!walletAddress) {
        // If this happens, we just ignore the row.
        continue;
      }
      // We delete the wallet address from the entry to save space.
      delete e.walletAddress;
      hashmapData[walletAddress] = e;
    }
    chrome.storage.sync.set({ [storageKey]: JSON.stringify(hashmapData) });
    setShowSaveSuccess(true);
  };

  return (
    <>
      <Alert
        show={showSaveSuccess}
        variant="success"
        onClose={() => setShowSaveSuccess(false)}
        dismissible
      >
        Saved!
      </Alert>
      We only support 40 entries at the moment!
      <br />
      <button
        className="btn btn-primary mr-2"
        onClick={saveData}>Save</button>
      <button
        className="btn btn-secondary mr-2"
        onClick={onAddRowClick}>Add entry</button>
      <Table
        columns={columns}
        data={data}
        updateMyData={updateMyData}
        skipPageReset={skipPageReset}
      />
    </>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
