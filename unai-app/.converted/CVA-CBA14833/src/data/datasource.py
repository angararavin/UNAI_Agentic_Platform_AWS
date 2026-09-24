from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseDataSource(ABC):
    """
    Abstract interface for SAP data ingestion. Enables clean switching between
    flat-file synthetic datasets and future live SAP S/4HANA OData/CDS/RFC clients.
    """

    @abstractmethod
    def load_table(self, agent_id: str, table_name: str) -> List[Dict[str, Any]]:
        """Loads all records from a table/entity set as a list of dictionaries."""
        pass

    @abstractmethod
    def get_demo_cases(self, agent_id: str) -> List[Dict[str, Any]]:
        """Retrieves curated demo/test cases for the specified agent."""
        pass

    @abstractmethod
    def get_record(self, agent_id: str, table_name: str, key_column: str, key_value: Any) -> Optional[Dict[str, Any]]:
        """Retrieves a single record matching the given key value."""
        pass

    @abstractmethod
    def get_records_filtered(self, agent_id: str, table_name: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Retrieves records matching multiple filter conditions."""
        pass
